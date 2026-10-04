// Nativo (iOS/Android, a futuro con EAS Build): localStorage respaldado por SQLite.
import 'expo-sqlite/localStorage/install';

export const authStorage = globalThis.localStorage;
