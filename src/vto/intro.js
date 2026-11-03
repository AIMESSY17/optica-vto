// Intro "ficha técnica" (T1.8, R-13, spec 02 §12, versión liviana de spec 05):
// al aparecer la cara, 1 s con 3 puntos rojos (ojos y puente) y una cota fina sobre las cejas con el código
// del lente. Se dibuja siguiendo la cara; después se desvanece y aparece el lente.
// Solo transform/opacity en el sentido de spec 05: acá es un canvas 2D, se anima la opacidad y el largo de la línea.
import { INTRO } from './constantes.js';

const ROJO = '#E0301E';
const MONO = "'IBM Plex Mono', ui-monospace, Menlo, monospace";
const reducido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Tramos de la animación (fracción de la duración).
const fade = (t, a, b) => Math.min(Math.max((t - a) / (b - a), 0), 1);
const suave = (x) => x * x * (3 - 2 * x);

// `espejado`: el canvas se muestra con scaleX(-1) (cámara en vivo): el texto se dibuja dado vuelta para que se lea.
export function crearIntro(canvas, { espejado }) {
  const ctx = canvas.getContext('2d');
  let enc = null;

  return {
    // Cuándo mostrar el lente (fracción de la intro): un poco antes del final, mientras se van los puntos.
    aparicionLente: reducido() ? 1 : 0.7,

    encuadrar(e) { enc = e; },
    limpiar() { ctx.clearRect(0, 0, canvas.width, canvas.height); },

    // t: 0 → 1 a lo largo de la intro.
    dibujar(landmarks, t, codigo) {
      this.limpiar();
      if (!enc || !landmarks) return;
      const dpr = canvas.width / enc.ancho;
      const px = (i) => [
        (landmarks[i].x * enc.anchoTotal - enc.offsetX) * dpr,
        (landmarks[i].y * enc.altoTotal - enc.offsetY) * dpr,
      ];
      const [a, b, puente] = INTRO.puntos.map(px);
      const cejas = INTRO.cejas.map(px);

      const estatico = reducido();
      const salida = estatico ? 1 : 1 - suave(fade(t, 0.72, 1)); // todo se va junto al final
      const aPuntos = (estatico ? 1 : suave(fade(t, 0, 0.18))) * salida;
      const largo = estatico ? 1 : suave(fade(t, 0.1, 0.45));
      const aTexto = (estatico ? 1 : fade(t, 0.38, 0.55)) * salida;

      // Dirección "arriba" de la cara: perpendicular a la línea de los ojos, hacia la frente.
      const ex = b[0] - a[0], ey = b[1] - a[1];
      const ancho = Math.hypot(ex, ey) || 1;
      let ux = ey / ancho, uy = -ex / ancho;
      const medioCejas = [(cejas[0][0] + cejas[1][0]) / 2, (cejas[0][1] + cejas[1][1]) / 2];
      if ((medioCejas[0] - puente[0]) * ux + (medioCejas[1] - puente[1]) * uy < 0) { ux = -ux; uy = -uy; }
      // La cota va un poco por encima de las cejas.
      const alturaCejas = (medioCejas[0] - (a[0] + b[0]) / 2) * ux + (medioCejas[1] - (a[1] + b[1]) / 2) * uy;
      const d = Math.max(alturaCejas, 0) + ancho * 0.12;
      const c1 = [a[0] + ux * d, a[1] + uy * d], c2 = [b[0] + ux * d, b[1] + uy * d];

      ctx.save();
      ctx.fillStyle = ROJO;
      ctx.strokeStyle = ROJO;
      ctx.lineWidth = 1 * dpr;

      // 3 puntos
      ctx.globalAlpha = aPuntos;
      for (const p of [a, b, puente]) { ctx.beginPath(); ctx.arc(p[0], p[1], 2.5 * dpr, 0, Math.PI * 2); ctx.fill(); }

      // Cota: crece desde el centro hacia los costados; topes verticales de 11 px.
      ctx.globalAlpha = salida;
      const m = [(c1[0] + c2[0]) / 2, (c1[1] + c2[1]) / 2];
      const p1 = [m[0] + (c1[0] - m[0]) * largo, m[1] + (c1[1] - m[1]) * largo];
      const p2 = [m[0] + (c2[0] - m[0]) * largo, m[1] + (c2[1] - m[1]) * largo];
      ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
      if (largo >= 1) {
        const tope = 5.5 * dpr;
        for (const p of [c1, c2]) {
          ctx.beginPath();
          ctx.moveTo(p[0] - ux * tope, p[1] - uy * tope);
          ctx.lineTo(p[0] + ux * tope, p[1] + uy * tope);
          ctx.stroke();
        }
      }

      // Rótulo en mono rojo sobre la cota (estilo "LX03" del boceto).
      if (aTexto > 0 && codigo) {
        const rotulo = codigo.replace(/^([A-Za-z]+)(\d+)$/, '$1X$2');
        ctx.globalAlpha = aTexto;
        ctx.font = `500 ${10 * dpr}px ${MONO}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        const tx = m[0] + ux * 6 * dpr, ty = m[1] + uy * 6 * dpr;
        ctx.translate(tx, ty);
        // Alineado con los ojos. Si el canvas se ve espejado, se da vuelta el texto (el ángulo ya queda bien).
        ctx.rotate(Math.atan2(ey, ex));
        if (espejado) ctx.scale(-1, 1);
        ctx.fillText(rotulo, 0, 0);
      }
      ctx.restore();
    },
  };
}
