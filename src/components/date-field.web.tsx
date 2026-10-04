import { useTheme } from '@/hooks/use-theme';
import { radius, spacing } from '@/lib/theme';

import type { DateFieldProps } from './date-field';

// Selector de fecha del navegador (en iOS abre la ruedita nativa). Devuelve 'YYYY-MM-DD'.
export function DateField({ value, onChange, accessibilityLabel, min }: DateFieldProps) {
  const { colors, dark } = useTheme();
  return (
    <input
      type="date"
      value={value}
      min={min}
      aria-label={accessibilityLabel}
      onChange={(e) => onChange(e.target.value)}
      style={{
        fontSize: 17,
        minHeight: 48,
        boxSizing: 'border-box',
        width: '100%',
        borderRadius: radius.md,
        border: `1px solid ${colors.separator}`,
        padding: `0 ${spacing.md}px`,
        backgroundColor: colors.card,
        color: colors.text,
        colorScheme: dark ? 'dark' : 'light',
        fontFamily: 'inherit',
      }}
    />
  );
}
