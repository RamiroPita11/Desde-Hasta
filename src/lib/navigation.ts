import { router } from 'expo-router';

/** Cierra un modal. Si se abrió directo por URL (sin historial), vuelve a la lista. */
export function closeModal(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
