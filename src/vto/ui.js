// Interfaz del probador (spec 05 "Probador (UI)", boceto docs/boceto/probador.html).
// Solo DOM: se arma al instante, mientras three y MediaPipe todavía se descargan.
const base = import.meta.env.BASE_URL;
export const rutaPublica = (ruta) => base + String(ruta).replace(/^\//, '');

const ICONO_CERRAR = '<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6 L18 18 M18 6 L6 18"/></svg>';

export function crearUi(contenedor, { lentes, onElegir, onColor, onCerrar, onConsultar }) {
  const raiz = document.createElement('div');
  raiz.className = 'vto';
  raiz.innerHTML = `
    <video class="vto-video" playsinline muted autoplay></video>
    <canvas class="vto-3d"></canvas>
    <canvas class="vto-2d"></canvas>
    <div class="vto-arriba">
      <div class="vto-pildora"><span class="vto-codigo"></span><span class="vto-nombre"></span></div>
      <button type="button" class="vto-cerrar" aria-label="Cerrar probador">${ICONO_CERRAR}</button>
    </div>
    <div class="vto-abajo">
      <div class="vto-aviso" role="status" aria-live="polite"></div>
      <section class="vto-panel" aria-label="Elegí un lente">
        <div class="vto-manija" aria-hidden="true"></div>
        <div class="vto-carrusel"></div>
        <div class="vto-fila">
          <div class="vto-colores" role="group" aria-label="Color"><span class="vto-colores-titulo">Color</span></div>
          <span class="vto-privado" title="Tu cámara no se graba ni se sube: todo pasa en tu celular">● TODO EN TU CELU</span>
        </div>
        <div class="vto-botones">
          <button type="button" class="vto-boton vto-boton-sec" data-foto disabled>Sacar foto</button>
          <button type="button" class="vto-boton vto-boton-prin" data-quiero>Lo quiero</button>
        </div>
      </section>
    </div>
  `;
  const $ = (sel) => raiz.querySelector(sel);
  const carrusel = $('.vto-carrusel');
  const avisoEl = $('.vto-aviso');
  const coloresEl = $('.vto-colores');
  let lenteColores = -1;
  let puntos = [];

  // Fila de colores del lente elegido (T1.4). Se arma de nuevo al cambiar de lente.
  const armarColores = (i) => {
    if (lenteColores === i) return;
    lenteColores = i;
    puntos.forEach((p) => p.remove());
    const variantes = lentes[i].variantes ?? [];
    coloresEl.hidden = variantes.length < 2;
    puntos = variantes.map((v, k) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'vto-color';
      b.style.setProperty('--muestra', v.muestra ?? v.frame?.color ?? '#999');
      if (v.claro) b.classList.add('claro');
      b.setAttribute('aria-label', v.nombre);
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', () => onColor(k));
      coloresEl.append(b);
      return b;
    });
  };

  // Una miniatura por lente (frente, fondo transparente). El catálogo nunca descarga GLB.
  const botones = lentes.map((l, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'vto-mini';
    b.setAttribute('aria-label', `Probar ${l.codigo} ${l.nombre}`);
    b.setAttribute('aria-pressed', 'false');
    const img = document.createElement('img');
    img.src = rutaPublica(l.miniaturas.frente);
    img.alt = '';
    img.width = 72; img.height = 56;
    img.decoding = 'async';
    b.append(img);
    b.addEventListener('click', () => onElegir(i));
    carrusel.append(b);
    return b;
  });

  $('.vto-cerrar').addEventListener('click', onCerrar);
  $('[data-quiero]').addEventListener('click', onConsultar);
  contenedor.append(raiz);

  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;

  return {
    raiz,
    video: $('.vto-video'),
    get lienzo3d() { return raiz.querySelector('.vto-3d'); },
    lienzo2d: $('.vto-2d'),

    // Marca el lente elegido: borde negro, píldora de arriba y carrusel centrado en él.
    marcar(i, { suave = true } = {}) {
      const l = lentes[i];
      armarColores(i);
      botones.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
      $('.vto-codigo').textContent = l.codigo;
      $('.vto-nombre').textContent = l.nombre;
      const b = botones[i];
      const x = b.offsetLeft - (carrusel.clientWidth - b.offsetWidth) / 2;
      carrusel.scrollTo({ left: Math.max(0, x), behavior: suave && !reducido ? 'smooth' : 'auto' });
    },
    marcarColor(k) {
      puntos.forEach((p, j) => {
        p.setAttribute('aria-pressed', String(j === k));
        p.setAttribute('aria-label', (lentes[lenteColores].variantes[j].nombre) + (j === k ? ', elegido' : ''));
      });
    },
    // Miniatura "cargando" mientras baja el lente (si no estaba precargado).
    cargando(i, si) { botones[i]?.classList.toggle('cargando', si); },

    aviso(texto) { if (avisoEl.textContent !== texto) avisoEl.textContent = texto; },

    quitar() { raiz.remove(); },
  };
}
