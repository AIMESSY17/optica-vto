// Cámara frontal (spec 02 §1). Llamar desde un toque del usuario (iOS lo exige).
import { VIDEO } from './constantes.js';

export async function abrirCamara(video) {
  if (!window.isSecureContext) throw new ErrorCamara('https', 'La cámara necesita una dirección https.');
  if (!navigator.mediaDevices?.getUserMedia) throw new ErrorCamara('sin-soporte', 'Este navegador no deja usar la cámara.');

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: VIDEO, audio: false });
  } catch (e) {
    if (e.name === 'NotAllowedError' || e.name === 'SecurityError')
      throw new ErrorCamara('permiso', 'No diste permiso para la cámara. Habilitala en el navegador y probá de nuevo.');
    if (e.name === 'NotFoundError' || e.name === 'OverconstrainedError')
      throw new ErrorCamara('sin-camara', 'No encontré una cámara en este equipo.');
    if (e.name === 'NotReadableError')
      throw new ErrorCamara('ocupada', 'La cámara está ocupada por otra app. Cerrala y probá de nuevo.');
    throw new ErrorCamara('otro', 'No se pudo abrir la cámara: ' + e.message);
  }

  video.setAttribute('playsinline', '');
  video.muted = true;
  video.srcObject = stream;
  if (video.readyState < 1) await new Promise((ok) => video.addEventListener('loadedmetadata', ok, { once: true }));
  await video.play();
  return stream;
}

export function cerrarCamara(video, stream) {
  stream?.getTracks().forEach((t) => t.stop());
  video.srcObject = null;
}

export class ErrorCamara extends Error {
  constructor(tipo, mensaje) {
    super(mensaje);
    this.tipo = tipo;
  }
}
