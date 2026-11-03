// Detección de la cara con MediaPipe FaceLandmarker (spec 02 §2). GPU con fallback a CPU.
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { RUTAS } from './constantes.js';

export async function crearDetector({ runningMode = 'VIDEO' } = {}) {
  const fileset = await FilesetResolver.forVisionTasks(RUTAS.wasm);
  const crear = (delegate) =>
    FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: RUTAS.modelo, delegate },
      runningMode,
      numFaces: 1,
      outputFacialTransformationMatrixes: true,
      outputFaceBlendshapes: false,
    });

  let delegate = 'GPU';
  let landmarker;
  try {
    landmarker = await crear('GPU');
  } catch (e) {
    console.warn('[vto] GPU no disponible, paso a CPU', e);
    delegate = 'CPU';
    landmarker = await crear('CPU');
  }

  let ultimoTs = 0;
  return {
    get delegate() { return delegate; },
    // Devuelve el resultado de MediaPipe. Si la GPU falla en el primer uso, reintenta en CPU.
    async detectar(video) {
      let ts = performance.now();
      if (ts <= ultimoTs) ts = ultimoTs + 1; // MediaPipe exige tiempos crecientes
      ultimoTs = ts;
      try {
        return landmarker.detectForVideo(video, ts);
      } catch (e) {
        if (delegate !== 'GPU') throw e;
        console.warn('[vto] falló la GPU al detectar, paso a CPU', e);
        landmarker.close();
        delegate = 'CPU';
        landmarker = await crear('CPU');
        return null;
      }
    },
    cerrar() { landmarker.close(); },
  };
}
