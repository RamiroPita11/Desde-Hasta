import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { useTheme } from '@/hooks/use-theme';
import { copyText } from '@/lib/clipboard';
import { confirmDestructive } from '@/lib/confirm';
import { closeModal } from '@/lib/navigation';
import { radius, spacing } from '@/lib/theme';
import {
  createWidgetScript,
  listWidgetTokens,
  revokeWidgetToken,
  type WidgetToken,
} from '@/lib/widget-tokens';

const STEPS = [
  'Instalá Scriptable (gratis) desde la App Store.',
  'Tocá "Generar script" y después "Copiar script".',
  'En Scriptable tocá +, pegá el script y ponele de nombre "Desde Hasta".',
  'En la pantalla de inicio, mantené apretado → Editar → Agregar widget → Scriptable.',
  'Tocá el widget → en "Script" elegí "Desde Hasta".',
];

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function WidgetScreen() {
  const { colors } = useTheme();
  const [script, setScript] = useState<string | null>(null);
  const [tokens, setTokens] = useState<WidgetToken[]>([]);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadTokens() {
    try {
      setTokens(await listWidgetTokens());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los widgets.');
    }
  }

  useEffect(() => {
    let active = true;
    listWidgetTokens()
      .then((list) => {
        if (active) setTokens(list);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : 'No se pudieron cargar los widgets.');
      });
    return () => {
      active = false;
    };
  }, []);

  async function generate() {
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      setScript(await createWidgetScript());
      await loadTokens();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo generar el script.');
    } finally {
      setBusy(false);
    }
  }

  function copy() {
    if (!script) return;
    // Sin await antes: Safari solo deja copiar dentro del mismo toque.
    void copyText(script).then((ok) => {
      setCopied(ok);
      if (!ok) setError('No se pudo copiar. Probá de nuevo.');
    });
  }

  async function revoke(id: string) {
    const ok = await confirmDestructive(
      '¿Revocar este widget?',
      'El widget que use este token va a dejar de mostrar tus eventos.',
      'Revocar',
    );
    if (!ok) return;
    try {
      await revokeWidgetToken(id);
      await loadTokens();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo revocar.');
    }
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.bar, { borderBottomColor: colors.separator }]}>
        <Text style={[styles.barTitle, { color: colors.text }]} accessibilityRole="header">
          Widget
        </Text>
        <Pressable accessibilityRole="button" onPress={closeModal} hitSlop={8}>
          <Text style={[styles.barAction, { color: colors.accent }]}>Listo</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.intro, { color: colors.secondaryText }]}>
          El widget del iPhone se hace con la app Scriptable. Muestra tus eventos y se actualiza
          solo.
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {STEPS.map((step, i) => (
            <View key={step} style={styles.step}>
              <Text style={[styles.stepNumber, { color: colors.accent }]}>{i + 1}</Text>
              <Text style={[styles.stepText, { color: colors.text }]}>{step}</Text>
            </View>
          ))}
        </View>

        {script ? (
          <>
            <Button title={copied ? '✓ Copiado' : 'Copiar script'} onPress={copy} />
            <Text style={[styles.note, { color: colors.secondaryText }]}>
              El script tiene un token personal: no lo compartas. Si se pierde, revocalo abajo y
              generá otro.
            </Text>
          </>
        ) : (
          <Button title="Generar script" onPress={() => void generate()} loading={busy} />
        )}

        {error ? (
          <Text style={[styles.note, { color: colors.danger }]} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}

        {tokens.length > 0 ? (
          <>
            <Text style={[styles.label, { color: colors.secondaryText }]}>Widgets conectados</Text>
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              {tokens.map((token) => (
                <View key={token.id} style={styles.tokenRow}>
                  <View style={styles.flex}>
                    <Text style={[styles.tokenTitle, { color: colors.text }]}>
                      Creado el {formatDateTime(token.created_at)}
                    </Text>
                    <Text style={[styles.tokenSub, { color: colors.secondaryText }]}>
                      {token.last_used_at
                        ? `Último uso: ${formatDateTime(token.last_used_at)}`
                        : 'Todavía no se usó'}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void revoke(token.id)}
                    hitSlop={8}
                  >
                    <Text style={[styles.revoke, { color: colors.danger }]}>Revocar</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  barTitle: { fontSize: 17, fontWeight: '600' },
  barAction: { fontSize: 17, fontWeight: '600' },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl * 2,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  intro: { fontSize: 16, lineHeight: 22 },
  card: { borderRadius: radius.lg, padding: spacing.md, gap: spacing.md },
  step: { flexDirection: 'row', gap: spacing.sm },
  stepNumber: { fontSize: 16, fontWeight: '800', width: 18 },
  stepText: { flex: 1, fontSize: 16, lineHeight: 22 },
  note: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: spacing.md,
  },
  tokenRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  tokenTitle: { fontSize: 15, fontWeight: '500' },
  tokenSub: { fontSize: 13 },
  revoke: { fontSize: 15, fontWeight: '500' },
});
