// Tapa marcas/logos en las texturas de un GLB ya normalizado (T2.4). Copia encima un parche limpio de al lado
// (con bordes suaves para que no se note el corte). Reescribe el GLB comprimido igual que normalizar.mjs.
//
// Uso:
//   node scripts/tapar-textura.mjs entrada.glb salida.glb --material FRAME_0 \
//        --zona base:715,422,205,40:0,-45 [--zona normal:5,670,160,35:0,-40 ...] [--quitar-sin-uso] [--ver carpeta]
//
//   --zona  mapa:x,y,ancho,alto:dx,dy   mapa = base | mr | normal | ao | emisivo (de ese material)
//           x,y,ancho,alto = zona a tapar en píxeles de esa textura; dx,dy = de dónde copiar (corrimiento)
//           o "liso" en vez de dx,dy: rellena con el color mediano de alrededor (para zonas parejas)
//   --quitar-sin-uso   borra texturas que ningún material usa a la vista (ej. firmas en extensiones de cristal)
//   --ver carpeta      guarda cada textura tocada en PNG (antes y después) para revisar
//
// Para ver dónde están las marcas: --ver con una zona vacía (0,0,1,1:0,0) exporta las texturas.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, meshopt } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const args = process.argv.slice(2);
const [entrada, salida] = args;
const valores = (k) => args.flatMap((a, i) => (a === '--' + k ? [args[i + 1]] : []));
const bandera = (k) => args.includes('--' + k);
if (!entrada || !salida) { console.error('Uso: node scripts/tapar-textura.mjs entrada.glb salida.glb --material FRAME_0 --zona base:x,y,w,h:dx,dy'); process.exit(1); }

await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(entrada);
const root = doc.getRoot();
const ver = valores('ver')[0];
if (ver) mkdirSync(ver, { recursive: true });

const nombreMat = valores('material')[0];
const mat = root.listMaterials().find((m) => m.getName() === nombreMat);
if (!mat) throw new Error(`No hay material ${nombreMat}. Hay: ${root.listMaterials().map((m) => m.getName()).join(', ')}`);
const texturaDe = {
  base: () => mat.getBaseColorTexture(), mr: () => mat.getMetallicRoughnessTexture(),
  normal: () => mat.getNormalTexture(), ao: () => mat.getOcclusionTexture(), emisivo: () => mat.getEmissiveTexture(),
};

// Agrupar zonas por textura (mr y ao suelen ser la misma imagen).
const porTextura = new Map();
for (const z of valores('zona')) {
  const [mapa, rect, corr = '0,0'] = z.split(':');
  const tex = texturaDe[mapa]?.();
  if (!tex) throw new Error(`El material ${nombreMat} no tiene textura "${mapa}"`);
  const [x, y, w, h] = rect.split(',').map(Number);
  const liso = corr === 'liso';
  const [dx, dy] = liso ? [0, 0] : corr.split(',').map(Number);
  if (!porTextura.has(tex)) porTextura.set(tex, { mapa, zonas: [] });
  porTextura.get(tex).zonas.push({ x, y, w, h, dx, dy, liso });
}

const BORDE = 4; // px de transición suave alrededor de cada parche
for (const [tex, { mapa, zonas }] of porTextura) {
  const img = sharp(Buffer.from(tex.getImage()));
  const { width: W, height: H } = await img.metadata();
  const px = await img.ensureAlpha().raw().toBuffer(); // RGBA
  if (ver) await sharp(px, { raw: { width: W, height: H, channels: 4 } }).png().toFile(`${ver}/${nombreMat}-${mapa}-antes.png`);
  const orig = Buffer.from(px);
  for (const { x, y, w, h, dx, dy, liso } of zonas) {
    // Modo liso: color mediano de un anillo de 6 px alrededor de la zona.
    let color = null;
    if (liso) {
      const canales = [[], [], [], []];
      for (let j = y - 6; j < y + h + 6; j++) for (let i = x - 6; i < x + w + 6; i++) {
        if (i < 0 || j < 0 || i >= W || j >= H || (i >= x && i < x + w && j >= y && j < y + h)) continue;
        for (let c = 0; c < 4; c++) canales[c].push(orig[(j * W + i) * 4 + c]);
      }
      color = canales.map((v) => v.sort((a, b) => a - b)[v.length >> 1]);
    }
    for (let j = y - BORDE; j < y + h + BORDE; j++) for (let i = x - BORDE; i < x + w + BORDE; i++) {
      if (i < 0 || j < 0 || i >= W || j >= H) continue;
      const si = Math.min(Math.max(i + dx, 0), W - 1), sj = Math.min(Math.max(j + dy, 0), H - 1);
      // Peso 1 adentro de la zona, baja a 0 en el borde.
      const fuera = Math.max(x - i, i - (x + w - 1), y - j, j - (y + h - 1), 0);
      const k = fuera === 0 ? 1 : Math.max(0, 1 - fuera / (BORDE + 1));
      if (k <= 0) continue;
      const d = (j * W + i) * 4, s = (sj * W + si) * 4;
      for (let c = 0; c < 4; c++) px[d + c] = Math.round(orig[d + c] * (1 - k) + (color ? color[c] : orig[s + c]) * k);
    }
  }
  if (ver) await sharp(px, { raw: { width: W, height: H, channels: 4 } }).png().toFile(`${ver}/${nombreMat}-${mapa}-despues.png`);
  const webp = await sharp(px, { raw: { width: W, height: H, channels: 4 } }).webp({ quality: 90 }).toBuffer();
  tex.setImage(new Uint8Array(webp)).setMimeType('image/webp');
  console.log(`${nombreMat} ${mapa}: ${zonas.length} zona(s) tapada(s)`);
}

if (bandera('quitar-sin-uso')) {
  // Texturas que no son de color/mr/normal/ao/emisivo de ningún material (quedan colgadas de extensiones).
  const visibles = new Set(root.listMaterials().flatMap((m) =>
    [m.getBaseColorTexture(), m.getMetallicRoughnessTexture(), m.getNormalTexture(), m.getOcclusionTexture(), m.getEmissiveTexture()].filter(Boolean)));
  for (const t of root.listTextures()) if (!visibles.has(t)) { console.log('textura sin uso a la vista: borrada'); t.dispose(); }
}

await doc.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write(salida, doc);
console.log('listo:', salida);
