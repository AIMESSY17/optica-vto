// Normaliza un GLB de lentes para el probador virtual (VTO).
// Resultado: Y arriba, frente mirando a +Z, patillas hacia -Z, origen en el puente,
// metros, ancho total = --ancho mm, materiales LENS_* / FRAME_*, comprimido (meshopt + webp).
//
// Uso:
//   node normalizar.mjs entrada.glb salida.glb --ancho 140 [--cristal "regex"] [--rotar x-90|x90|y90|y-90|z90|z-90]
//                       [--max-tris 60000] [--cristal-claro] [--sin-textura-cristal]
//   --cristal            regex del nombre de material de los cristales (si no hay cristales, omitir)
//   --rotar              rotación previa si el modelo viene acostado o de costado
//   --cristal-claro      convierte cristales a transparentes (para pasar un lente de sol a receta)
//   --sin-textura-cristal saca la textura de los cristales (ej: logos de marca impresos)
//   --quitar "regex"     borra las piezas cuyo nombre coincida (ej: logos de marcas reales)
//   --listar             muestra las piezas numeradas (nombre, vértices, material, medidas en mm) y sale
//   --quitar-piezas 1,3  borra piezas por número (el de --listar): para logos modelados en 3D cuando todas
//                        las piezas se llaman igual
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { flatten, clearNodeTransform, prune, dedup, weld, simplify, textureCompress, meshopt, metalRough, getBounds, dequantize } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const args = process.argv.slice(2); const [input, output] = args;
const opt = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const anchoMM = Number(opt('ancho', 140)), lensRe = opt('cristal', null), rot = opt('rotar', null), maxTris = Number(opt('max-tris', 60000));
await MeshoptEncoder.ready; await MeshoptDecoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder }) // decoder: para poder releer GLB ya comprimidos;
const doc = await io.read(input); const root = doc.getRoot();
const piezas = root.listNodes().filter((n) => n.getMesh());
if (args.includes('--listar')) {
  piezas.forEach((n, i) => { const b = getBounds(n), mm = (k) => `${Math.round(b.min[k] * 1000)}..${Math.round(b.max[k] * 1000)}`;
    const prims = n.getMesh().listPrimitives();
    console.log(`#${i}  ${n.getName() || '-'} / ${n.getMesh().getName() || '-'}  vértices ${prims.reduce((s, p) => s + p.getAttribute('POSITION').getCount(), 0)}  material ${prims.map((p) => p.getMaterial()?.getName() ?? '-').join(',')}  x ${mm(0)} y ${mm(1)} z ${mm(2)} (unidades del archivo ×1000)`); });
  process.exit(0);
}
if (opt('quitar-piezas', null)) {
  const nums = new Set(String(opt('quitar-piezas')).split(',').map(Number));
  piezas.forEach((n, i) => { if (nums.has(i)) { console.log(`quito pieza #${i}`); n.getMesh().dispose(); n.dispose(); } });
}

// 1) convertir specular-glossiness (no soportado por three.js) a metal-rough
if (root.listExtensionsUsed().some(e => e.extensionName === 'KHR_materials_pbrSpecularGlossiness')) await doc.transform(metalRough());
// 1b) si el GLB ya venía comprimido (cuantizado), pasar a números comunes: si no, al hornear se rompen las normales
await doc.transform(dequantize());
// 2) hornear transformaciones (las animaciones bloquean el flatten, se borran: un lente no las necesita)
for (const a of root.listAnimations()) a.dispose();
if (opt('quitar', null)) { const q = new RegExp(opt('quitar'), 'i'); for (const n of root.listNodes()) if (n.getMesh() && (q.test(n.getName()) || q.test(n.getMesh().getName()))) { n.getMesh().dispose(); n.dispose(); } }
await doc.transform(flatten());
for (const n of root.listNodes()) if (n.getMesh()) clearNodeTransform(n);

const prims = root.listMeshes().flatMap(m => m.listPrimitives());
const re = lensRe ? new RegExp(lensRe, 'i') : null;
const isLensMat = m => !!(re && m && re.test(m.getName()));
const mapVec = (fn, withTangent = true) => { for (const p of prims) for (const sem of ['POSITION', 'NORMAL', 'TANGENT']) {
  const a = p.getAttribute(sem); if (!a || (sem === 'TANGENT' && !withTangent)) continue; const st = a.getElementSize(); const arr = a.getArray().slice();
  for (let i = 0; i < arr.length; i += st) { const r = fn([arr[i], arr[i + 1], arr[i + 2]], sem); arr[i] = r[0]; arr[i + 1] = r[1]; arr[i + 2] = r[2]; } a.setArray(arr); } };
const forPos = (filter, cb) => { const v = [0, 0, 0]; for (const p of prims) { if (!filter(p)) continue; const a = p.getAttribute('POSITION'); for (let i = 0; i < a.getCount(); i++) { a.getElement(i, v); cb(v); } } };
const bounds = filter => { const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; forPos(filter, v => { for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], v[k]); mx[k] = Math.max(mx[k], v[k]); } }); return { mn, mx }; };

// 3) rotación previa opcional
const R = { 'x-90': ([x, y, z]) => [x, z, -y], 'x90': ([x, y, z]) => [x, -z, y], 'y90': ([x, y, z]) => [z, y, -x], 'y-90': ([x, y, z]) => [-z, y, x], 'z90': ([x, y, z]) => [-y, x, z], 'z-90': ([x, y, z]) => [y, -x, z] };
if (rot) { if (!R[rot]) throw new Error('rotar inválido: ' + rot); mapVec(v => R[rot](v)); }

// 4) detectar frente: el puente (vértices cerca de x=centro) solo existe adelante
const all = bounds(() => true); const cx = (all.mn[0] + all.mx[0]) / 2, W = all.mx[0] - all.mn[0];
let zs = 0, zn = 0; forPos(p => !isLensMat(p.getMaterial()), v => { if (Math.abs(v[0] - cx) < W * 0.08) { zs += v[2]; zn++; } });
const hasLens = prims.some(p => isLensMat(p.getMaterial()));
const lens = hasLens ? bounds(p => isLensMat(p.getMaterial())) : null;
const refZ = hasLens ? (lens.mn[2] + lens.mx[2]) / 2 : zs / zn;
const flip = refZ < (all.mn[2] + all.mx[2]) / 2;
const frontZ = flip ? all.mn[2] : all.mx[2];
// centro vertical: el de los cristales, o el del frente (vértices del 25% delantero)
let cy;
if (hasLens) cy = (lens.mn[1] + lens.mx[1]) / 2;
else { const D = all.mx[2] - all.mn[2]; let mn = 1e9, mx = -1e9; forPos(() => true, v => { if (Math.abs(v[2] - frontZ) < D * 0.12) { mn = Math.min(mn, v[1]); mx = Math.max(mx, v[1]); } }); cy = (mn + mx) / 2; }
const s = (anchoMM / 1000) / W;
mapVec(([x, y, z], sem) => { if (sem === 'POSITION') { x = (x - cx) * s; y = (y - cy) * s; z = (z - frontZ) * s; } return flip ? [-x, y, -z] : [x, y, z]; });

// 5) materiales: nombres + opciones de cristal
let li = 0, fi = 0;
for (const m of root.listMaterials()) {
  if (isLensMat(m)) {
    m.setName(`LENS_${li++}`);
    if (opt('sin-textura-cristal', false) || opt('cristal-claro', false)) m.setBaseColorTexture(null);
    if (opt('cristal-claro', false)) { m.setBaseColorFactor([0.95, 0.97, 1, 0.12]); m.setAlphaMode('BLEND'); m.setRoughnessFactor(0.05); m.setMetallicFactor(0); }
  } else m.setName(`FRAME_${fi++}`);
}
// 6) optimizar
let tris = 0; for (const p of prims) { const i = p.getIndices(); tris += (i ? i.getCount() : p.getAttribute('POSITION').getCount()) / 3; }
const ops = [dedup(), weld()];
if (tris > maxTris) ops.push(simplify({ simplifier: MeshoptSimplifier, ratio: maxTris / tris, error: 0.0008 }));
ops.push(prune(), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024] }), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await doc.transform(...ops);
await io.write(output, doc);
let t2 = 0; for (const p of root.listMeshes().flatMap(m => m.listPrimitives())) { const i = p.getIndices(); t2 += (i ? i.getCount() : p.getAttribute('POSITION').getCount()) / 3; }
const b = getBounds(root.getDefaultScene() || root.listScenes()[0]);
console.log(JSON.stringify({ output: output.split('/').pop(), girado180: flip, trisAntes: tris, trisDespues: t2, mm: b.max.map((v, k) => Math.round((v - b.min[k]) * 1000)), cristales: li }));
