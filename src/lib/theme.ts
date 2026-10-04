export const palette = {
  light: {
    background: '#F2F2F7',
    card: '#FFFFFF',
    text: '#000000',
    secondaryText: '#6C6C70',
    tertiaryText: '#AEAEB2',
    separator: '#E5E5EA',
    fill: '#E9E9EF',
    accent: '#FF9500',
    danger: '#FF3B30',
    onAccent: '#FFFFFF',
  },
  dark: {
    background: '#000000',
    card: '#1C1C1E',
    text: '#FFFFFF',
    secondaryText: '#AEAEB2',
    tertiaryText: '#636366',
    separator: '#38383A',
    fill: '#2C2C2E',
    accent: '#FF9F0A',
    danger: '#FF453A',
    onAccent: '#FFFFFF',
  },
} as const;

export type ThemeColors = { [K in keyof typeof palette.light]: string };

export const radius = { sm: 10, md: 14, lg: 22 } as const;
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
