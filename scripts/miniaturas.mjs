// Genera las miniaturas de un lente (frente y 3/4, WebP con fondo transparente) para el catálogo (T2.3).
// Usa los mismos cristales y el mismo color inicial que el probador, así la miniatura se parece a lo que se ve en la cara.
//
// Uso:
//   node scripts/miniaturas.mjs                  → todos los lentes de public/models/catalogo.json
//   node scripts/miniaturas.mjs L07 L08          → solo esos (código o id)
//   node scripts/miniaturas.mjs --salida carpeta → guarda en otra carpeta (para comparar antes de pisar)
//
// Necesita Playwright con Chromium (`npx playwright install chromium`, una sola vez) o Google Chrome instalado.
import { createServer } from 'vite';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const iSalida = args.indexOf('--salida');
const salida = iSalida >= 0 ? path.resolve(args[iSalida + 1]) : path.join(raiz, 'public/models/thumbs');
const pedidos = args.filter((a, i) => !a.startsWith('--') && i !== iSalida + 1);
const ANCHO = { frente: 640, '34': 568 }; // ancho final en px (como las miniaturas originales)

const catalogo = JSON.parse(readFileSync(path.join(raiz, 'public/models/catalogo.json'), 'utf8'));
const lentes = catalogo.lentes.filter((l) => !pedidos.length || pedidos.includes(l.codigo) || pedidos.includes(l.id));
if (!lentes.length) { console.error('No encontré esos lentes en el catálogo:', pedidos.join(', ')); process.exit(1); }
mkdirSync(salida, { recursive: true });

const servidor = await createServer({ root: raiz, configFile: path.join(raiz, 'vite.config.js'), logLevel: 'error', server: { port: 0, host: '127.0.0.1' } });
await servidor.listen();
const url = servidor.resolvedUrls.local[0];
const opciones = { args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] };
// El Chromium de Playwright; si no está instalado, el Chrome de la compu.
const navegador = await chromium.launch(opciones).catch(() => chromium.launch({ ...opciones, channel: 'chrome' }));
try {
  const pagina = await navegador.newPage({ ignoreHTTPSErrors: true });
  pagina.on('pageerror', (e) => console.error('[página]', e.message));
  await pagina.goto(new URL('scripts/miniaturas.html', url).href);
  await pagina.waitForFunction(() => window.listo, null, { timeout: 60000 });

  for (const lente of lentes) {
    for (const vista of ['frente', '34']) {
      const png = await pagina.evaluate((p) => window.renderizar(p), { url: lente.archivo, info: lente, vista });
      const archivo = path.join(salida, `${lente.id}_${vista}.webp`);
      // Recortar el fondo transparente, dejar un margen chico y llevar al ancho final.
      const recortada = await sharp(Buffer.from(png.split(',')[1], 'base64')).trim({ threshold: 1 }).toBuffer();
      await sharp(recortada)
        .extend({ top: 4, bottom: 4, left: 4, right: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .resize({ width: ANCHO[vista] })
        .webp({ quality: 85, alphaQuality: 90 })
        .toFile(archivo);
      console.log(`${lente.codigo} ${vista} → ${path.relative(raiz, archivo)}`);
    }
  }
} finally {
  await navegador.close();
  await servidor.close();
}
