// Genera public/img/og.jpg (1200×630): la imagen que se ve al compartir el link (WhatsApp, Instagram, etc.). T3.9.
// Marca, slogan y lente salen de public/data/sitio.json y del catálogo. Correr de nuevo al cambiar la marca (T5.3).
//   node scripts/og-imagen.mjs
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const leer = (r) => JSON.parse(readFileSync(path.join(raiz, r), 'utf8'));
const sitio = leer('public/data/sitio.json');
const lente = leer('public/models/catalogo.json').lentes.find((l) => l.codigo === sitio.hero.lente);
const W = 1200, H = 630;
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const slogan = (sitio.marca.slogan || 'Ver claro').split(' ');

const texto = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <style>
    .t { font-family: 'Archivo', 'Arial Black', 'Helvetica Neue', Arial, sans-serif; font-weight: 900; fill: #111; letter-spacing: -6px; }
    .m { font-family: 'IBM Plex Mono', 'Consolas', 'Courier New', monospace; fill: #6B6B68; font-size: 20px; letter-spacing: 2px; }
  </style>
  <text x="72" y="104" class="t" style="font-size:44px;letter-spacing:-1px">${esc(sitio.marca.nombre)}</text>
  <text x="72" y="300" class="t" style="font-size:150px">${esc(slogan[0])}</text>
  <text x="72" y="440" class="t" style="font-size:150px">${esc(slogan.slice(1).join(' '))}.</text>
  <text x="72" y="550" class="m">${esc(`${sitio.marca.rubro} · ${sitio.marca.ciudad}`.toUpperCase())}</text>
  <text x="72" y="584" class="m" style="fill:#9A9A96;font-size:16px">PROBATE LOS LENTES EN TU CARA, EN 3D</text>
  <g stroke="#E0301E" stroke-width="2"><line x1="640" y1="470" x2="1130" y2="470"/><line x1="640" y1="459" x2="640" y2="481"/><line x1="1130" y1="459" x2="1130" y2="481"/></g>
  <text x="1130" y="506" text-anchor="end" style="font-family:'IBM Plex Mono','Consolas',monospace;font-size:18px;fill:#E0301E">${lente.ancho_total_mm} MM</text>
</svg>`);

const foto = await sharp(path.join(raiz, 'public', lente.miniaturas.frente.replace(/^\//, '')))
  .resize({ width: 500, height: 260, fit: 'inside' }).toBuffer();
const { width: fw, height: fh } = await sharp(foto).metadata();

await sharp({ create: { width: W, height: H, channels: 3, background: '#FAFAF8' } })
  .composite([{ input: foto, left: Math.round(885 - fw / 2), top: Math.round(330 - fh / 2) }, { input: texto, left: 0, top: 0 }])
  .jpeg({ quality: 86, mozjpeg: true })
  .toFile(path.join(raiz, 'public/img/og.jpg'));
console.log('listo: public/img/og.jpg');
