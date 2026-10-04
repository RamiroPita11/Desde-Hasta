import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { useTheme } from '@/hooks/use-theme';
import {
  isValidEmail,
  normalizeEmail,
  OTP_LENGTH,
  sendLoginCode,
  verifyLoginCode,
} from '@/lib/auth';
import { radius, spacing } from '@/lib/theme';

const RESEND_SECONDS = 60;

type Step = 'email' | 'code';

export default function LoginScreen() {
  const { colors } = useTheme();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const codeInput = useRef<TextInput>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  async function requestCode() {
    if (!isValidEmail(email) || busy) return;
    setBusy(true);
    setError(null);
    try {
      await sendLoginCode(email);
      setStep('code');
      setCode('');
      setResendIn(RESEND_SECONDS);
      setTimeout(() => codeInput.current?.focus(), 50);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo mandar el código.');
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(value: string) {
    if (value.length !== OTP_LENGTH || busy) return;
    setBusy(true);
    setError(null);
    try {
      // Si sale bien, onAuthStateChange cambia la sesión y el layout lleva a la lista.
      await verifyLoginCode(email, value);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo verificar el código.');
      setCode('');
      setBusy(false);
    }
  }

  function onChangeCode(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setCode(digits);
    if (digits.length === OTP_LENGTH) void submitCode(digits);
  }

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.card, color: colors.text, borderColor: colors.separator },
  ];

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.logo} accessibilityElementsHidden importantForAccessibility="no">
            🌱
          </Text>
          <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
            Desde / Hasta
          </Text>
          <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
            {step === 'email'
              ? 'Entrá con tu email. Te mandamos un código de 6 dígitos.'
              : `Escribí el código que mandamos a ${normalizeEmail(email)}.`}
          </Text>
        </View>

        {step === 'email' ? (
          <View style={styles.form}>
            <TextInput
              style={inputStyle}
              value={email}
              onChangeText={setEmail}
              onSubmitEditing={() => void requestCode()}
              placeholder="tu@email.com"
              placeholderTextColor={colors.tertiaryText}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="send"
              accessibilityLabel="Email"
              autoFocus
            />
            <Button
              title="Mandar código"
              onPress={() => void requestCode()}
              loading={busy}
              disabled={!isValidEmail(email)}
            />
          </View>
        ) : (
          <View style={styles.form}>
            <TextInput
              ref={codeInput}
              style={[inputStyle, styles.codeInput]}
              value={code}
              onChangeText={onChangeCode}
              placeholder="000000"
              placeholderTextColor={colors.tertiaryText}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={OTP_LENGTH}
              accessibilityLabel="Código de 6 dígitos"
              editable={!busy}
            />
            <Button
              title="Entrar"
              onPress={() => void submitCode(code)}
              loading={busy}
              disabled={code.length !== OTP_LENGTH}
            />
            <View style={styles.row}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setStep('email');
                  setError(null);
                }}
                hitSlop={8}
              >
                <Text style={[styles.link, { color: colors.accent }]}>Cambiar email</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={resendIn > 0 || busy}
                onPress={() => void requestCode()}
                hitSlop={8}
              >
                <Text
                  style={[
                    styles.link,
                    { color: resendIn > 0 ? colors.tertiaryText : colors.accent },
                  ]}
                >
                  {resendIn > 0 ? `Reenviar en ${resendIn} s` : 'Reenviar código'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {error ? (
          <Text style={[styles.error, { color: colors.danger }]} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  header: { alignItems: 'center', marginBottom: spacing.xl, gap: spacing.sm },
  logo: { fontSize: 56 },
  title: { fontSize: 34, fontWeight: '800', letterSpacing: 0.3 },
  subtitle: { fontSize: 17, textAlign: 'center', lineHeight: 23 },
  form: { gap: spacing.md },
  // font-size >= 16 para que Safari no haga zoom al enfocar.
  input: {
    fontSize: 17,
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
  },
  codeInput: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 12,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.xs },
  link: { fontSize: 16, fontWeight: '500' },
  error: { marginTop: spacing.md, fontSize: 15, textAlign: 'center' },
});
