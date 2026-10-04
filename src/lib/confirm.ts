import { Alert } from 'react-native';

/** Pide confirmación antes de una acción destructiva. */
export function confirmDestructive(
  title: string,
  message: string,
  action: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: action, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
