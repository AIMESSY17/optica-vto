// Máscara de los cristales de un lente (Edición 01, capítulo "Control de la vista"): blanco donde está el
// hueco del aro, transparente en el resto. Con ella, la tabla optométrica se ve nítida solo a través de los cristales.
// Sale de la miniatura grande de frente (npm run miniaturas -- --grande): lo transparente que no toca el borde = cristal.
// Uso: node scripts/mascara-cristales.mjs L01  → public/models/mascaras/<id>.png
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'node:fs';
const catalogo = JSON.parse(readFileSync('public/models/catalogo.json', 'utf8'));
const pedidos = process.argv.slice(2);
mkdirSync('public/models/mascaras', { recursive: true });
for (const l of catalogo.lentes.filter((x) => !pedidos.length || pedidos.includes(x.codigo))) {
  const origen = 'public/' + l.miniaturas.frente.replace(/^\//, '').replace(/_frente\.webp$/, '_frente_1600.webp');
  const { data, info } = await sharp(origen).resize({ width: 800 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const vacio = (i) => data[i * 4 + 3] < 140;
  // Relleno desde el borde: todo lo vacío conectado con afuera NO es cristal.
  const afuera = new Uint8Array(w * h);
  const pila = [];
  for (let x = 0; x < w; x++) pila.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) pila.push(y * w, y * w + w - 1);
  while (pila.length) {
    const i = pila.pop();
    if (afuera[i] || !vacio(i)) continue;
    afuera[i] = 1;
    const x = i % w, y = (i / w) | 0;
    if (x > 0) pila.push(i - 1); if (x < w - 1) pila.push(i + 1);
    if (y > 0) pila.push(i - w); if (y < h - 1) pila.push(i + w);
  }
  const out = Buffer.alloc(w * h * 4);
  let n = 0;
  for (let i = 0; i < w * h; i++) {
    // Cristal = adentro del aro (no conectado con afuera) y no es marco opaco. Las patillas que se ven a través, también.
    if (afuera[i] || data[i * 4 + 3] > 200) continue;
    out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = 255; out[i * 4 + 3] = 255; n++;
  }
  const archivo = `public/models/mascaras/${l.id}.png`;
  await sharp(out, { raw: { width: w, height: h, channels: 4 } }).blur(0.6).png({ compressionLevel: 9 }).toFile(archivo);
  console.log(l.codigo, '→', archivo, `(${Math.round((100 * n) / (w * h))} % cristal)`);
}
