// Web/PWA: el localStorage del navegador. En la PWA instalada en iOS es propio de la app,
// separado del de Safari.
export const authStorage = typeof window === 'undefined' ? undefined : window.localStorage;
