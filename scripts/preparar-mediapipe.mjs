// Deja listos los archivos de MediaPipe que servimos nosotros (spec 02 §2).
// Corre solo después de `npm install` (postinstall), también en Vercel.
//  - Copia el wasm de node_modules a public/mediapipe/wasm/ (siempre, para que coincida con la versión instalada).
//  - Descarga face_landmarker.task a public/mediapipe/ si todavía no está.
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const origenWasm = join(raiz, 'node_modules/@mediapipe/tasks-vision/wasm');
const destino = join(raiz, 'public/mediapipe');
const destinoWasm = join(destino, 'wasm');
const modelo = join(destino, 'face_landmarker.task');
const URL_MODELO =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

mkdirSync(destinoWasm, { recursive: true });

// Solo los archivos que usa FilesetResolver.forVisionTasks() (con y sin SIMD).
const archivos = readdirSync(origenWasm).filter((f) => /^vision_wasm_(nosimd_)?internal\.(js|wasm)$/.test(f));
if (archivos.length < 4) throw new Error('No encontré el wasm de MediaPipe en ' + origenWasm);
for (const f of archivos) copyFileSync(join(origenWasm, f), join(destinoWasm, f));
console.log(`[mediapipe] wasm copiado (${archivos.length} archivos)`);

if (existsSync(modelo)) {
  console.log('[mediapipe] face_landmarker.task ya está');
} else {
  console.log('[mediapipe] descargando face_landmarker.task…');
  const res = await fetch(URL_MODELO);
  if (!res.ok) throw new Error(`No se pudo descargar el modelo (${res.status})`);
  writeFileSync(modelo, Buffer.from(await res.arrayBuffer()));
  console.log('[mediapipe] modelo descargado');
}
