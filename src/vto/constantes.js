// Valores del motor del probador (spec 02). Se afinan con ?debug=1.

// Cámara 3D que usa MediaPipe para calcular la matriz de la cara (spec 02 §3). Unidades: cm.
export const CAMARA = { fov: 63, near: 1, far: 10000 };

// Landmark 168 de la cara canónica (puente de la nariz), en cm.
export const PUENTE_BASE = { x: 0, y: 3.271, z: 5.236 };

// Corrección fina del lente respecto del puente, en cm (spec 02 §4). Se ajusta con los sliders de debug.
export const AJUSTE_PUENTE = { x: 0, y: -0.8, z: 0.6 };

// Los GLB están en metros; la cara de MediaPipe en cm.
export const ESCALA_LENTE = 100;

// Oclusor (cara invisible que tapa las patillas de atrás). Ancho 1.0: más angosto deja ver la cara interna de las
// patillas a través del cristal; para que de perfil no tape la patilla cercana, se abren las patillas (T1.0).
// `corrimientoZ` en cm (negativo = atrás).
export const OCLUSOR = { escala: { x: 1.0, y: 1, z: 1.04 }, corrimientoZ: 0 };

// Patillas abiertas hacia afuera desde la bisagra (T1.0), para que no queden dentro de la cara invisible.
// aperturaGrados: giro desde la bisagra. separacionMm: corrimiento extra hacia afuera en X.
// bisagraZ y transicion en metros (espacio del GLB): detrás de bisagraZ las patillas empiezan a moverse y llegan
// al giro completo `transicion` más atrás. xMinRelativo: los vértices más cerca del centro no se tocan (nariz, puente).
export const PATILLAS = { aperturaGrados: 7, separacionMm: 0, bisagraZ: -0.012, transicion: 0.012, xMinRelativo: 0.5 };

// Cristales (T1.3). Receta: alfa casi 0 + reflejo del ambiente sumado encima (topeBrillo: cuánto puede aclarar, 0–1). Sol: tinte con degradé (más oscuro arriba).
// El tinte de cada lente de sol se puede pisar en el catálogo con "cristal": { "tinte": "#..." }.
export const CRISTAL = {
  colorReceta: '#F4F7FA', alfaReceta: 0.04, reflejo: 0.6, topeBrillo: 0.1,
  tinteSol: '#2A2C26', solArriba: 0.9, solAbajo: 0.55,
};

// Suavizado One Euro (spec 02 §6). Rotación: la velocidad se mide en grados/s.
export const SUAVIZADO = { activo: true, minCutoff: 1.0, beta: 0.37, dCutoff: 1.0 };

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
