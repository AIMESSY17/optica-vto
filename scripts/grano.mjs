// Grano analógico (Edición 01): PNG de ruido monocromo de 256×256 que se usa en mosaico sobre los fondos.
// Uso: node scripts/grano.mjs  → public/img/grano.png
import sharp from 'sharp';
const L = 256;
const px = Buffer.alloc(L * L);
// mulberry32 con semilla fija: siempre sale el mismo archivo, sin patrones a la vista
let s = 1234567;
const azar = () => {
  s = (s + 0x6D2B79F5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
for (let i = 0; i < px.length; i++) {
  const g = (azar() + azar() + azar()) / 3; // más cerca del gris medio, como el grano de película
  px[i] = Math.round(g * 15) * 17; // 16 tonos: el PNG queda chico
}
await sharp(px, { raw: { width: L, height: L, channels: 1 } }).png({ palette: true, colors: 16, compressionLevel: 9 }).toFile('public/img/grano.png');
console.log('public/img/grano.png');
