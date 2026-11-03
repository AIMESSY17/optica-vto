// Fotos editoriales (spec 08): de public/fotos/editorial/*.jpg saca AVIF y WebP en varios anchos
// + public/fotos/editorial/gen/fotos.json (qué fotos hay, medidas y si la portada es clara u oscura).
// Uso: npm run fotos   (después de poner o cambiar una foto)
// index.html arma los <picture> con esa lista al compilar (vite.config.js). Si una foto falta, queda el rectángulo [FOTO ...].
import sharp from 'sharp';
import { readdirSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'public/fotos/editorial';
const GEN = join(DIR, 'gen');
const ANCHOS = {
  'portada-pc': [1280, 1920, 2560],
  'portada-celu': [640, 960, 1280],
  color: [480, 800, 1200, 1600],
};
const ANCHOS_LOOKBOOK = [480, 800, 1200];
const NOMBRES = ['portada-pc', 'portada-celu', 'color', ...Array.from({ length: 9 }, (_, i) => `lookbook-${String(i + 1).padStart(2, '0')}`)];

if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
rmSync(GEN, { recursive: true, force: true });
mkdirSync(GEN, { recursive: true });

const archivos = readdirSync(DIR).filter((f) => /\.jpe?g$/i.test(f));
const lista = {};
for (const nombre of NOMBRES) {
  const archivo = archivos.find((f) => f.replace(/\.jpe?g$/i, '').toLowerCase() === nombre);
  if (!archivo) { console.log(`· falta ${nombre}.jpg (queda el rectángulo)`); continue; }
  const entrada = sharp(join(DIR, archivo)).rotate(); // respeta la orientación EXIF del celu/cámara
  const { width: w0, height: h0 } = await entrada.clone().metadata().then((m) => (m.orientation >= 5 ? { width: m.height, height: m.width } : m));
  const pedidos = ANCHOS[nombre] ?? ANCHOS_LOOKBOOK;
  const anchos = [...new Set(pedidos.filter((a) => a < w0).concat(Math.min(w0, pedidos.at(-1))))].sort((a, b) => a - b);
  for (const a of anchos) {
    const r = entrada.clone().resize({ width: a });
    await r.clone().avif({ quality: 50, effort: 4 }).toFile(join(GEN, `${nombre}-${a}.avif`));
    await r.clone().webp({ quality: 74 }).toFile(join(GEN, `${nombre}-${a}.webp`));
  }
  const dato = { anchos, ancho: w0, alto: h0 };
  // Portada: ¿la franja donde va "FOCO" es clara u oscura? → título negro o blanco
  if (nombre.startsWith('portada')) {
    const franja = { left: 0, top: Math.round(h0 * 0.3), width: w0, height: Math.round(h0 * 0.4) };
    const { channels } = await entrada.clone().extract(franja).stats();
    const [r, g, b] = channels.map((c) => c.mean / 255);
    const luz = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    dato.tono = luz > 0.55 ? 'claro' : 'oscuro';
    dato.luz = Number(luz.toFixed(2));
  }
  lista[nombre] = dato;
  console.log(`✓ ${nombre}: ${anchos.join(', ')} px${dato.tono ? ` · fondo ${dato.tono} → FOCO ${dato.tono === 'claro' ? 'negro' : 'blanco'}` : ''}`);
}
writeFileSync(join(GEN, 'fotos.json'), JSON.stringify(lista, null, 2));
console.log(`${GEN}/fotos.json · ${Object.keys(lista).length} de ${NOMBRES.length} fotos`);
