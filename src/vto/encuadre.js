// Calcula cómo se recorta el video con object-fit: cover, para recortar igual el 3D y los puntos.
// Si el 3D no tiene la misma relación de aspecto que el video, el lente se corre (spec 02 §3).
// `fuente` = <video> o <canvas> (selfie del plan B).
export function calcularEncuadre(contenedor, fuente) {
  const ancho = contenedor.clientWidth;
  const alto = contenedor.clientHeight;
  const videoAncho = fuente.videoWidth || fuente.width || 1280;
  const videoAlto = fuente.videoHeight || fuente.height || 720;
  const escala = Math.max(ancho / videoAncho, alto / videoAlto);
  const anchoTotal = videoAncho * escala;
  const altoTotal = videoAlto * escala;
  return {
    ancho, alto, videoAncho, videoAlto, anchoTotal, altoTotal,
    offsetX: (anchoTotal - ancho) / 2,
    offsetY: (altoTotal - alto) / 2,
  };
}
