// Contorno de cada lente (frente) para la tira técnica del catálogo (Edición 01), estilo lámina de análisis.
// Sale de la miniatura de frente: borde de la silueta en línea fina, fondo transparente.
// Uso: node scripts/contornos.mjs  → public/models/contornos/<id>.png
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'node:fs';
const catalogo = JSON.parse(readFileSync('public/models/catalogo.json', 'utf8'));
mkdirSync('public/models/contornos', { recursive: true });
const ANCHO = 400;
for (const l of catalogo.lentes) {
  const { data, info } = await sharp('public/' + l.miniaturas.frente.replace(/^\//, ''))
    .resize({ width: ANCHO }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const lleno = (x, y) => x >= 0 && y >= 0 && x < w && y < h && data[(y * w + x) * 4 + 3] > 90;
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    // Borde = pixel lleno con algún vecino vacío (por fuera y por dentro de los aros)
    if (!lleno(x, y)) continue;
    if (lleno(x - 1, y) && lleno(x + 1, y) && lleno(x, y - 1) && lleno(x, y + 1)) continue;
    const i = (y * w + x) * 4;
    out[i] = out[i + 1] = out[i + 2] = 17; out[i + 3] = 255;
  }
  const archivo = `public/models/contornos/${l.id}.png`;
  await sharp(out, { raw: { width: w, height: h, channels: 4 } }).png({ palette: true, colors: 4, compressionLevel: 9 }).toFile(archivo);
  console.log(l.codigo, '→', archivo);
}
