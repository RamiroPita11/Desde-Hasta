// En web, Alert.alert de react-native-web no hace nada: se usa el confirm del navegador.
export function confirmDestructive(
  title: string,
  message: string,
  _action: string,
): Promise<boolean> {
  return Promise.resolve(window.confirm(`${title}\n\n${message}`));
}
