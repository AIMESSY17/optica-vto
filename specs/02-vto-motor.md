# 02 — Motor del probador (VTO)

Módulo independiente en `src/vto/`. La página lo abre con `import('./vto/index.js')` (import dinámico) y le pasa el catálogo y el lente elegido.

## Piezas
```
cámara (getUserMedia) ──► MediaPipe FaceLandmarker ──► matriz de la cara (4x4) + 478 landmarks
                                                           │
                                                 suavizado (One Euro)
                                                           │
Three.js: escena con cámara de 63°  ◄── grupo "cabeza" (aplica la matriz)
                                          ├── oclusor (cara canónica invisible)
                                          └── lente GLB (escala ×100, offset al puente)
```

## 1. Cámara
- `getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })`.
- `<video playsinline muted autoplay>` (obligatorio en iOS). Mostrar en **espejo** (`scaleX(-1)`) y espejar también el render 3D para que coincidan.
- HTTPS obligatorio (Vercel ya lo da; en dev `@vitejs/plugin-basic-ssl`).

## 2. Detección: MediaPipe FaceLandmarker
- `npm i @mediapipe/tasks-vision`. Copiar `node_modules/@mediapipe/tasks-vision/wasm/*` a `public/mediapipe/wasm/`.
- Modelo: descargar `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task` a `public/mediapipe/face_landmarker.task` (servirlo nosotros = sin depender de Google y con caché).
- Opciones: `runningMode: 'VIDEO'`, `numFaces: 1`, `outputFacialTransformationMatrixes: true`, `outputFaceBlendshapes: false`, `delegate: 'GPU'` con **fallback a 'CPU'** si falla.
- Loop con `requestVideoFrameCallback` (fallback `requestAnimationFrame`): `detectForVideo(video, performance.now())`.

## 3. Cámara 3D que calza con MediaPipe
MediaPipe calcula la matriz para una cámara de perspectiva **vertical FOV 63°, near 1 cm, far 10000 cm**, unidades en **centímetros** (confirmado en `mediapipe/graphs/face_effect/face_effect_gpu.pbtxt`).
- `new THREE.PerspectiveCamera(63, videoAspect, 1, 10000)` en el origen mirando a -Z.
- El canvas tiene que tener **la misma relación de aspecto que el video** (o recortar video y canvas igual con `object-fit: cover` calculado), si no, el lente se corre.

## 4. Grupo cabeza
- `head = new THREE.Group(); head.matrixAutoUpdate = false;` y por frame `head.matrix.fromArray(result.facialTransformationMatrixes[0].data)` (column-major).
- **Oclusor:** `canonical_face_model.obj` (ya está en cm, mismo espacio que la matriz) con `material.colorWrite = false`, `depthWrite = true`, `renderOrder = -1`. Opcional: agrandarlo 3–5 % en X/Z para que tape mejor las patillas.
- **Lente:** el GLB está en metros con origen en el puente → `glasses.scale.setScalar(100)` y `glasses.position.set(0, 2.87, 5.84)`.
  - Punto de partida: landmark 168 de la cara canónica = `(0, 3.271, 5.236)` cm + offset fino `(0, -0.4, +0.6)` cm.
  - Dejar el offset en una constante `AJUSTE_PUENTE` y un modo debug (`?debug=1`) con sliders para afinarlo.
- Si no hay cara en el frame: ocultar el lente con fade de 150 ms (no dejarlo congelado).

## 5. Escala
- La matriz de MediaPipe ya incluye la escala de la cara de cada persona → el lente se adapta solo.
- Extra (F1, opcional): **iris** para tamaño real. El iris humano mide ~11,7 mm. Con landmarks 468–477 (iris) se puede estimar mm/píxel y mostrar "DIP aproximada" (distancia entre pupilas). Siempre con el texto "orientativo, no reemplaza la medición en la óptica".

## 6. Suavizado (R-05)
- **One Euro Filter** sobre posición (3) y rotación (cuaternión → slerp con alfa adaptativo). Parámetros iniciales: `minCutoff 1.0`, `beta 0.05`. Ajustar en debug.

## 7. Render y materiales
- `WebGLRenderer({ alpha: true, antialias: true })`, `setPixelRatio(Math.min(devicePixelRatio, 2))`, `toneMapping = ACESFilmic`, `outputColorSpace = SRGB`.
- Luz: `RoomEnvironment` por PMREM (reflejos lindos en metal y acetato) + una direccional suave. Nada de sombras en tiempo real.
- Cristales `LENS_*`: transparentes; de sol con tinte/degradé. Evitar `transmission` en el celu (caro): convertir a `MeshPhysicalMaterial` con `opacity`/`transparent` o `MeshStandardMaterial` transparente.

## 8. Degradación por rendimiento (R-10)
Medir FPS promedio cada 2 s:
1. < 28 FPS → pixelRatio a 1.
2. < 24 FPS → detectar cada 2 frames (interpolar la matriz entre detecciones).
3. < 18 FPS → apagar antialias / environment simple.

## 9. Carga
- Al tocar "Probátelos": mostrar la UI del probador al instante con un loader temático (dos círculos de lente que se "enfocan").
- En paralelo: import de three + mediapipe, `FaceLandmarker.createFromOptions`, GLB del lente, OBJ del oclusor.
- Precargar el GLB del siguiente y anterior del carrusel.
- Cachear con Service Worker (`face_landmarker.task`, wasm, GLB) → la segunda vez abre en < 1 s.

## 10. Foto (R-08)
- Dibujar en un canvas 2D: frame del video (espejado) + `renderer.domElement` + marco/branding FOCO + código del lente.
- `canvas.toBlob` → `navigator.share({ files })` si existe; si no, descarga.

## 11. Plan B sin cámara (R-09)
- `<input type="file" accept="image/*" capture="user">` → FaceLandmarker en `runningMode: 'IMAGE'` sobre la foto → mismo pipeline sobre un frame fijo.

## 12. Intro "ficha técnica" (R-13)
- Al primer frame con cara: dibujar en un canvas 2D por 1 s los landmarks clave (ojos 33/263, puente 168, sienes 234/454, mentón 152, frente 10) como puntitos rojos, líneas de medida con cotas en mono (`dx`, `LX01`, `52□18`) y luego fade-in del lente. Debe sentirse como la referencia `docs/referencias/03-ficha-tecnica-landmarks.jpg`.

## API del módulo
```js
const vto = await abrirProbador({ contenedor, catalogo, idInicial, onConsultar, onCerrar });
vto.cambiarLente(id); vto.cambiarColor(variante); vto.sacarFoto(); vto.cerrar(); // cerrar libera cámara y GPU
```
