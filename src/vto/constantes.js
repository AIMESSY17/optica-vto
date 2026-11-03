// Valores del motor del probador (spec 02). Se afinan con ?debug=1.

// Cámara 3D que usa MediaPipe para calcular la matriz de la cara (spec 02 §3). Unidades: cm.
export const CAMARA = { fov: 63, near: 1, far: 10000 };

// Landmark 168 de la cara canónica (puente de la nariz), en cm.
export const PUENTE_BASE = { x: 0, y: 3.271, z: 5.236 };

// Corrección fina del lente respecto del puente, en cm (spec 02 §4). Se ajusta con los sliders de debug.
export const AJUSTE_PUENTE = { x: 0, y: -0.4, z: 0.6 };

// Los GLB están en metros; la cara de MediaPipe en cm.
export const ESCALA_LENTE = 100;

// Oclusor (cara invisible que tapa las patillas). Un poco más ancho y profundo para que tape mejor.
export const ESCALA_OCLUSOR = { x: 1.04, y: 1, z: 1.04 };

// Suavizado One Euro (spec 02 §6). Rotación: la velocidad se mide en grados/s.
export const SUAVIZADO = { activo: true, minCutoff: 1.0, beta: 0.05, dCutoff: 1.0 };

// Opciones de cámara (spec 02 §1).
export const VIDEO = { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } };

// Archivos que servimos nosotros (spec 02 §2).
const base = import.meta.env.BASE_URL;
export const RUTAS = {
  wasm: base + 'mediapipe/wasm',
  modelo: base + 'mediapipe/face_landmarker.task',
  oclusor: base + 'models/occluder/canonical_face_model.obj',
  catalogo: base + 'models/catalogo.json',
};

// Sin cara por más de este tiempo → reiniciar el suavizado (para que no "viaje" desde la pose vieja).
export const MS_SIN_CARA_REINICIO = 300;
