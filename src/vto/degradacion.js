// Degradación automática por rendimiento (T1.7, R-10, spec 02 §8).
// Mide los FPS promedio cada 2 s y, si no alcanzan, baja un escalón de calidad (uno por medición):
//   1: < 28 FPS → pixelRatio 1
//   2: < 24 FPS → detectar la cara cada 2 cuadros (el del medio se estima)
//   3: < 18 FPS → iluminación simple (sin environment)
// Solo baja, nunca vuelve a subir: así no oscila entre niveles.
import { DEGRADACION } from './constantes.js';

export function crearDegradacion(alCambiar) {
  const { ventanaMs, esperaInicialMs, umbrales } = DEGRADACION;
  let nivel = 0;
  let forzado = -1; // debug: -1 = automático
  let inicio = null, desde = null, cuadros = 0, fps = 0;

  const efectivo = () => (forzado >= 0 ? forzado : nivel);

  return {
    get nivel() { return efectivo(); },
    get fps() { return fps; },
    get forzado() { return forzado; },

    // Debug: fijar un nivel a mano (-1 vuelve al automático).
    forzar(n) {
      const antes = efectivo();
      forzado = n;
      if (efectivo() !== antes) alCambiar(efectivo());
    },

    // Llamar una vez por cuadro procesado (con o sin cara).
    cuadro(ahora) {
      if (desde === null) { desde = ahora; inicio ??= ahora; cuadros = 0; return; }
      cuadros++;
      const dt = ahora - desde;
      if (dt < ventanaMs) return;
      desde = ahora;
      const n = cuadros;
      cuadros = 0;
      // Una pausa larga (otra app, pestaña oculta) no es lentitud: no se juzga.
      if (dt > ventanaMs * 2) return;
      fps = (n * 1000) / dt;
      if (ahora - inicio < esperaInicialMs || forzado >= 0) return; // el arranque siempre es más lento
      const objetivo = umbrales.filter((u) => fps < u).length;
      if (objetivo > nivel) {
        nivel++;
        console.info(`[vto] ${fps.toFixed(1)} FPS → calidad nivel ${nivel}`);
        alCambiar(efectivo());
      }
    },

    // Al ocultarse la página o volver de una pausa: empezar a medir de nuevo.
    reiniciar() { desde = null; },
  };
}
