// Página de prueba del probador (F0, T0.3). Three.js y MediaPipe se cargan recién al tocar "Abrir cámara".
import { abrirCamara, cerrarCamara } from './vto/camara.js';
import { RUTAS } from './vto/constantes.js';

const $ = (id) => document.getElementById(id);
const inicio = $('inicio'), probador = $('probador'), video = $('video');
const botonAbrir = $('abrir'), estado = $('estado'), aviso = $('aviso');

const params = new URLSearchParams(location.search);
const debug = params.get('debug') === '1';
const codigoLente = (params.get('lente') || 'L01').toUpperCase(); // ?lente=L03 para probar otro

let stream = null;
let poc = null;
let sesion = 0; // cambia al cerrar: si se cierra mientras carga, se descarta lo que llegue tarde

botonAbrir.addEventListener('click', async () => {
  const miSesion = ++sesion;
  botonAbrir.disabled = true;
  estado.textContent = 'Abriendo la cámara…';
  // La cámara se pide primero y dentro del toque (iOS); el resto se descarga en paralelo.
  const motor = import('./vto/poc.js');
  const catalogo = fetch(RUTAS.catalogo).then((r) => r.json());
  motor.catch(() => {}); catalogo.catch(() => {});

  try {
    stream = await abrirCamara(video);
    inicio.hidden = true;
    probador.hidden = false;
    aviso.textContent = 'Cargando el probador…';

    const lente = (await catalogo).lentes.find((l) => l.codigo === codigoLente);
    if (!lente) throw new Error(`No existe el lente ${codigoLente} en el catálogo`);
    const { iniciarPoc } = await motor;
    const nuevo = await iniciarPoc({
      contenedor: probador, video, aviso, debug,
      lienzo3d: $('lienzo3d'), lienzo2d: $('lienzo2d'),
      urlLente: import.meta.env.BASE_URL + lente.archivo.replace(/^\//, ''),
    });
    if (miSesion !== sesion) return nuevo.cerrar(); // lo cerraron mientras cargaba
    poc = nuevo;
    aviso.textContent = '';
  } catch (e) {
    if (miSesion !== sesion) return;
    console.error(e);
    cerrar();
    estado.textContent = e.message || 'Algo falló al abrir el probador.';
  }
});

$('cerrar').addEventListener('click', () => {
  cerrar();
  estado.textContent = '';
});

function cerrar() {
  sesion++;
  poc?.cerrar();
  poc = null;
  cerrarCamara(video, stream);
  stream = null;
  probador.hidden = true;
  inicio.hidden = false;
  botonAbrir.disabled = false;
}
