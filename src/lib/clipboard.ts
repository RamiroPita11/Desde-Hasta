import * as Clipboard from 'expo-clipboard';

export function copyText(text: string): Promise<boolean> {
  return Clipboard.setStringAsync(text);
}
