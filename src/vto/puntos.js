// Dibuja los 478 puntos de la cara en un canvas 2D (T0.4). Solo para debug.
export function crearPuntos(canvas) {
  const ctx = canvas.getContext('2d');
  let enc = null;
  let dpr = 1;

  return {
    encuadrar(e) {
      enc = e;
      dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = Math.round(e.ancho * dpr);
      canvas.height = Math.round(e.alto * dpr);
    },
    limpiar() { ctx.clearRect(0, 0, canvas.width, canvas.height); },
    dibujar(landmarks) {
      this.limpiar();
      if (!enc || !landmarks) return;
      ctx.fillStyle = '#E0301E';
      const r = 1.2 * dpr;
      for (const p of landmarks) {
        const x = (p.x * enc.anchoTotal - enc.offsetX) * dpr;
        const y = (p.y * enc.altoTotal - enc.offsetY) * dpr;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
    },
  };
}
