import { useColorScheme } from 'react-native';

import { palette, type ThemeColors } from '@/lib/theme';

export function useTheme(): { colors: ThemeColors; dark: boolean } {
  const dark = useColorScheme() === 'dark';
  return { colors: dark ? palette.dark : palette.light, dark };
}
