import { StyleSheet, TextInput } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import type { ISODate } from '@/lib/counter';
import { radius, spacing } from '@/lib/theme';

export interface DateFieldProps {
  value: ISODate;
  onChange: (value: ISODate) => void;
  accessibilityLabel: string;
  min?: ISODate;
}

// En nativo no hay selector de fecha incluido: se escribe AAAA-MM-DD.
// La app se usa como PWA, donde date-field.web.tsx muestra el selector del navegador.
export function DateField({ value, onChange, accessibilityLabel }: DateFieldProps) {
  const { colors } = useTheme();
  return (
    <TextInput
      style={[
        styles.input,
        { backgroundColor: colors.card, color: colors.text, borderColor: colors.separator },
      ]}
      value={value}
      onChangeText={(text) => onChange(text.replace(/[^\d-]/g, '').slice(0, 10))}
      placeholder="AAAA-MM-DD"
      placeholderTextColor={colors.tertiaryText}
      keyboardType="numbers-and-punctuation"
      accessibilityLabel={accessibilityLabel}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    fontSize: 17,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
  },
});
