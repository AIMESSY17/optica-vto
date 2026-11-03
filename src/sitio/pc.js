// Solo PC con mouse (main.js lo importa si matchMedia('(min-width: 1024px) and (pointer: fine)')).
// Cursor propio y botones magnéticos. En celular este archivo ni se descarga.
// Sin 3D: en la home los modelos 3D no se usan como imagen grande (CLAUDE.md, spec 08).

const TOCABLES = 'a, button, select, .pieza, .categoria';

export function iniciarPc({ reducido }) {
  cursorPropio();
  if (!reducido) botonesMagneticos();
}

// Aro chico que sigue al mouse y se agranda sobre lentes y botones
function cursorPropio() {
  const aro = document.createElement('div');
  aro.className = 'cursor oculto';
  aro.setAttribute('aria-hidden', 'true');
  document.body.append(aro);
  document.documentElement.classList.add('cursor-propio');
  let x = -100, y = -100, pendiente = false;
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    x = e.clientX; y = e.clientY;
    // Con una hoja o el probador abiertos vuelve el cursor normal
    aro.classList.toggle('oculto', document.body.classList.contains('trabado'));
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(() => { pendiente = false; aro.style.transform = `translate3d(${x}px, ${y}px, 0)`; });
  }, { passive: true });
  document.addEventListener('pointerover', (e) => aro.classList.toggle('grande', !!e.target.closest?.(TOCABLES)));
  document.documentElement.addEventListener('pointerleave', () => aro.classList.add('oculto'));
}

// Botones que se acercan unos px al cursor
function botonesMagneticos() {
  const MAX = 8;
  document.addEventListener('pointermove', (e) => {
    const b = e.target.closest?.('.boton');
    if (!b || b.closest('.hoja')) return;
    const r = b.getBoundingClientRect();
    const dx = Math.max(-MAX, Math.min(MAX, (e.clientX - (r.left + r.width / 2)) * 0.25));
    const dy = Math.max(-MAX, Math.min(MAX, (e.clientY - (r.top + r.height / 2)) * 0.4));
    b.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`;
  }, { passive: true });
  document.addEventListener('pointerout', (e) => {
    const b = e.target.closest?.('.boton');
    if (b && !b.contains(e.relatedTarget)) b.style.translate = '';
  });
}
