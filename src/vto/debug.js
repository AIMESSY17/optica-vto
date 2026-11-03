// Panel de ?debug=1 (T0.6, T1.0): FPS, mostrar/ocultar oclusor y puntos, sliders de AJUSTE_PUENTE, oclusor, patillas y suavizado.
import { ajusteCristal } from './cristales.js';

export function crearDebug(contenedor, { escena, suavizado, opciones }) {
  const panel = document.createElement('details');
  panel.className = 'debug';
  panel.open = true;
  panel.innerHTML = `
    <summary>debug <span class="fps">-- fps</span></summary>
    <div class="info"></div>
    <div class="casillas">
      <label><input type="checkbox" data-op="oclusor"> ver oclusor</label>
      <label><input type="checkbox" data-op="puntos"> ver 478 puntos</label>
      <label><input type="checkbox" data-op="lente"> ver lente</label>
      <label><input type="checkbox" data-op="suavizado"> suavizado</label>
    </div>
    <div class="sliders"></div>
    <button type="button" data-copiar>copiar valores</button>
  `;
  contenedor.append(panel);

  const fpsEl = panel.querySelector('.fps');
  const infoEl = panel.querySelector('.info');

  // Casillas
  const estado = { oclusor: opciones.oclusor, puntos: opciones.puntos, lente: opciones.lente, suavizado: suavizado.activo };
  for (const cb of panel.querySelectorAll('[data-op]')) {
    const op = cb.dataset.op;
    cb.checked = estado[op];
    cb.addEventListener('change', () => {
      if (op === 'suavizado') suavizado.activo = cb.checked;
      else opciones[op] = cb.checked;
      if (op === 'oclusor') escena.oclusorVisible = cb.checked;
      if (op === 'lente') escena.lenteVisible = cb.checked;
    });
  }

  // Sliders
  const sliders = [
    { nombre: 'ajuste X (cm)', obj: escena.ajuste, k: 'x', min: -2, max: 2, paso: 0.05, alCambiar: escena.aplicarAjuste },
    { nombre: 'ajuste Y (cm)', obj: escena.ajuste, k: 'y', min: -2, max: 2, paso: 0.05, alCambiar: escena.aplicarAjuste },
    { nombre: 'ajuste Z (cm)', obj: escena.ajuste, k: 'z', min: -2, max: 3, paso: 0.05, alCambiar: escena.aplicarAjuste },
    { nombre: 'ancho oclusor', obj: escena.forma, k: 'oclusorAncho', min: 0.95, max: 1.05, paso: 0.01, alCambiar: escena.aplicarOclusor },
    { nombre: 'oclusor Z (cm)', obj: escena.forma, k: 'oclusorZ', min: -2, max: 1, paso: 0.05, alCambiar: escena.aplicarOclusor },
    { nombre: 'apertura patillas (°)', obj: escena.forma, k: 'aperturaPatillas', min: 0, max: 15, paso: 0.5, alCambiar: escena.aplicarPatillas },
    { nombre: 'separación patillas (mm)', obj: escena.forma, k: 'separacionPatillas', min: 0, max: 8, paso: 0.25, alCambiar: escena.aplicarPatillas },
    { nombre: 'cristal receta (opacidad)', obj: ajusteCristal.alfaReceta, k: 'value', min: 0, max: 0.3, paso: 0.01 },
    { nombre: 'reflejo cristal', obj: ajusteCristal.reflejo, k: 'value', min: 0, max: 3, paso: 0.1 },
    { nombre: 'tope brillo cristal', obj: ajusteCristal.topeBrillo, k: 'value', min: 0, max: 0.4, paso: 0.01 },
    { nombre: 'minCutoff', obj: suavizado, k: 'minCutoff', min: 0.05, max: 5, paso: 0.05 },
    { nombre: 'beta', obj: suavizado, k: 'beta', min: 0, max: 0.5, paso: 0.005 },
  ];
  const caja = panel.querySelector('.sliders');
  for (const s of sliders) {
    const label = document.createElement('label');
    label.innerHTML = `<span></span><input type="range" min="${s.min}" max="${s.max}" step="${s.paso}">`;
    const txt = label.querySelector('span');
    const input = label.querySelector('input');
    const pintar = () => (txt.textContent = `${s.nombre}: ${(+s.obj[s.k]).toFixed(3)}`);
    input.value = s.obj[s.k];
    pintar();
    input.addEventListener('input', () => { s.obj[s.k] = +input.value; pintar(); s.alCambiar?.(); });
    caja.append(label);
  }

  panel.querySelector('[data-copiar]').addEventListener('click', async () => {
    const r = (n) => Math.round(n * 1000) / 1000;
    const texto = JSON.stringify({
      AJUSTE_PUENTE: { x: r(escena.ajuste.x), y: r(escena.ajuste.y), z: r(escena.ajuste.z) },
      SUAVIZADO: { minCutoff: r(suavizado.minCutoff), beta: r(suavizado.beta) },
      OCLUSOR: { anchoX: r(escena.forma.oclusorAncho), corrimientoZ: r(escena.forma.oclusorZ) },
      CRISTAL: { alfaReceta: r(ajusteCristal.alfaReceta.value), reflejo: r(ajusteCristal.reflejo.value), topeBrillo: r(ajusteCristal.topeBrillo.value) },
      PATILLAS: { aperturaGrados: r(escena.forma.aperturaPatillas), separacionMm: r(escena.forma.separacionPatillas) },
    });
    try { await navigator.clipboard.writeText(texto); alert('Copiado:\n' + texto); }
    catch { prompt('Copiá estos valores:', texto); }
  });

  // Medición de FPS: cuadros procesados (detección + render) por segundo.
  // Se empieza a contar desde el primer cuadro, para no mezclar el arranque de MediaPipe con los FPS.
  let cuadros = 0, msDeteccion = 0, desde = null;
  // Temblor (R-05): cuánto se mueve el lente de un cuadro al otro, sin y con suavizado. Con la cabeza quieta tiene que dar casi 0.
  const temblor = { crudo: 0, suave: 0, n: 0, pc: null, ps: null };
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const pos = (m) => [m.elements[12], m.elements[13], m.elements[14]];
  return {
    pose(matCruda, matSuave) {
      const pc = pos(matCruda), ps = pos(matSuave);
      if (temblor.pc) { temblor.crudo += dist(pc, temblor.pc); temblor.suave += dist(ps, temblor.ps); temblor.n++; }
      temblor.pc = pc; temblor.ps = ps;
    },
    sinCara() { temblor.pc = temblor.ps = null; },
    cuadro(msDet) {
      if (desde === null) { desde = performance.now(); infoEl.textContent = `primer cuadro: ${msDet.toFixed(0)} ms`; return; }
      cuadros++; msDeteccion += msDet;
    },
    actualizar(info) {
      if (desde === null) return;
      const ahora = performance.now();
      const dt = ahora - desde;
      if (dt < 500) return;
      const fps = (cuadros * 1000) / dt;
      fpsEl.textContent = `${fps.toFixed(1)} fps`;
      // La cámara entrega como máximo ~30 cuadros/s. Rojo = por debajo del primer umbral de degradación (spec 02 §8).
      fpsEl.classList.toggle('mal', fps < 28);
      const mm = (v) => ((v / Math.max(temblor.n, 1)) * 10).toFixed(2); // cm → mm
      infoEl.textContent = `detección ${(msDeteccion / Math.max(cuadros, 1)).toFixed(1)} ms · ${info}\n` +
        `movimiento por cuadro: crudo ${mm(temblor.crudo)} mm · suavizado ${mm(temblor.suave)} mm`;
      cuadros = 0; msDeteccion = 0; desde = ahora;
      temblor.crudo = temblor.suave = temblor.n = 0;
    },
    quitar() { panel.remove(); },
  };
}
