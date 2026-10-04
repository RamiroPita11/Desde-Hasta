/** El script empaquetado del widget (public/widget.js, se arma con `npm run build:widget`). */
export async function loadWidgetSource(): Promise<string> {
  const res = await fetch('/widget.js', { cache: 'no-store' });
  const text = await res.text();
  // Sin el archivo, el servidor devuelve el index.html de la app.
  if (!res.ok || !text.includes('DH_CONFIG')) {
    throw new Error('No se encontró el script del widget. Corré `npm run build:widget`.');
  }
  return text;
}
