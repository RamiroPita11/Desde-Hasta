/** El script empaquetado del widget (public/widget.js). Solo lo sirve la PWA. */
export function loadWidgetSource(): Promise<string> {
  return Promise.reject(new Error('Generá el widget desde la app web (PWA).'));
}
