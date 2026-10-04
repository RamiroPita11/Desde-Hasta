// Dibuja el ícono de la app (una plantita sobre fondo naranja) en los tamaños que usan
// la PWA, el favicon y la app nativa. Uso: node scripts/generate-icons.mjs
// Se dibuja con geometría (no se escala una imagen), así cada tamaño queda nítido.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Jimp = require('jimp-compact');

const TOP = [0xff, 0xb3, 0x40];
const BOTTOM = [0xff, 0x8a, 0x00];
const WHITE = [0xff, 0xff, 0xff];

// Coordenadas en un lienzo de 1024 × 1024. La plantita queda dentro de la zona segura
// del 80 % que piden los íconos "maskable" de Android.
function inEllipse(x, y, cx, cy, rx, ry, angleDeg) {
  const a = (angleDeg * Math.PI) / 180;
  const dx = x - cx;
  const dy = y - cy;
  const u = dx * Math.cos(a) + dy * Math.sin(a);
  const v = -dx * Math.sin(a) + dy * Math.cos(a);
  return (u * u) / (rx * rx) + (v * v) / (ry * ry) <= 1;
}

function inStem(x, y) {
  const half = 30;
  const top = 470;
  const bottom = 790;
  if (y < top || y > bottom) {
    const cy = y < top ? top : bottom;
    return (x - 512) ** 2 + (y - cy) ** 2 <= half * half;
  }
  return Math.abs(x - 512) <= half;
}

function isPlant(x, y) {
  return (
    inStem(x, y) ||
    inEllipse(x, y, 385, 430, 160, 80, 35) ||
    inEllipse(x, y, 650, 380, 185, 92, -38)
  );
}

const SAMPLES = 4;

async function render(size, path) {
  const image = new Jimp(size, size);
  const data = image.bitmap.data;
  const scale = 1024 / size;

  for (let py = 0; py < size; py++) {
    const t = py / (size - 1);
    const bg = TOP.map((c, i) => Math.round(c + (BOTTOM[i] - c) * t));
    for (let px = 0; px < size; px++) {
      let hits = 0;
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const x = (px + (sx + 0.5) / SAMPLES) * scale;
          const y = (py + (sy + 0.5) / SAMPLES) * scale;
          if (isPlant(x, y)) hits++;
        }
      }
      const k = hits / (SAMPLES * SAMPLES);
      const o = (py * size + px) * 4;
      for (let i = 0; i < 3; i++) data[o + i] = Math.round(bg[i] + (WHITE[i] - bg[i]) * k);
      data[o + 3] = 255;
    }
  }

  await image.writeAsync(path);
  console.log(`${path} (${size}×${size})`);
}

await render(1024, 'assets/images/icon.png');
await render(48, 'assets/images/favicon.png');
await render(180, 'public/apple-touch-icon.png');
await render(192, 'public/icon-192.png');
await render(512, 'public/icon-512.png');
