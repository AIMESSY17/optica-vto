// Página de prueba del probador (F0 → F1). La página real de la óptica llega en F3.
// index.js es liviano (sin three ni MediaPipe): lo bajamos al cargar la página para que, al tocar el botón,
// abrirProbador() arranque en el mismo toque (iOS pide la cámara solo así). Lo pesado baja recién ahí.
import { RUTAS } from './vto/constantes.js';

const $ = (id) => document.getElementById(id);
const inicio = $('inicio'), probador = $('probador');
const botonAbrir = $('abrir'), estado = $('estado');

const params = new URLSearchParams(location.search);
const debug = params.get('debug') === '1';
const lenteInicial = (params.get('lente') || 'L01').toUpperCase(); // ?lente=L03 para arrancar con otro

let modulo = null;
const cargaModulo = import('./vto/index.js').then((m) => (modulo = m));
const cargaCatalogo = fetch(RUTAS.catalogo).then((r) => r.json());
let catalogo = null;
cargaCatalogo.then((c) => (catalogo = c), () => {});
cargaModulo.catch(() => {});

let abriendo = false;

botonAbrir.addEventListener('click', async () => {
  if (abriendo) return;
  abriendo = true;
  botonAbrir.disabled = true;
  estado.textContent = '';
  try {
    // Casi siempre ya está todo descargado y no hay espera antes de pedir la cámara.
    const { abrirProbador } = modulo ?? (await cargaModulo);
    const cat = catalogo ?? (await cargaCatalogo);
    inicio.hidden = true;
    probador.hidden = false;
    await abrirProbador({
      contenedor: probador,
      catalogo: cat,
      idInicial: lenteInicial,
      debug,
      onCerrar: volver,
      onConsultar: (lente, color) =>
        alert(`Lo quiero: ${lente.codigo} ${lente.nombre}${color ? ' · ' + color.nombre : ''}\n(en F3 abre WhatsApp)`),
    });
  } catch (e) {
    if (e.tipo === 'cerrado') return;
    console.error(e);
    volver();
    estado.textContent = e.message || 'Algo falló al abrir el probador.';
  } finally {
    abriendo = false;
    botonAbrir.disabled = false;
  }
});

function volver() {
  probador.hidden = true;
  inicio.hidden = false;
}
