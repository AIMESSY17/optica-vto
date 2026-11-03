// Motor del probador: une cámara, MediaPipe, suavizado y Three.js (spec 02).
// Es la parte pesada (three + mediapipe): index.js lo importa recién al abrir el probador.
import { Matrix4 } from 'three';
import { crearDetector } from './detector.js';
import { crearEscena } from './escena.js';
import { calcularEncuadre } from './encuadre.js';
import { crearPuntos } from './puntos.js';
import { FiltroPose } from './one-euro.js';
import { MS_SIN_CARA_REINICIO, SUAVIZADO } from './constantes.js';

export async function iniciarMotor({ contenedor, video, lienzo3d, lienzo2d, aviso, urlLente, debug }) {
  const escena = crearEscena(lienzo3d);
  const puntos = crearPuntos(lienzo2d);
  const suavizado = { ...SUAVIZADO };
  const filtro = new FiltroPose(suavizado);
  const opciones = { oclusor: false, puntos: debug, lente: true };

  // Caché de lentes (R-06): url → promesa del modelo ya cargado y con los shaders listos.
  // Se queda con el lente puesto y sus vecinos del carrusel; el resto se libera.
  const cache = new Map();
  const obtener = (url) => {
    if (!cache.has(url)) {
      const p = escena.cargarModelo(url).then(async (m) => { await escena.precompilarModelo(m); return m; });
      p.catch(() => cache.delete(url)); // si falló, que se pueda reintentar
      cache.set(url, p);
    }
    return cache.get(url);
  };
  let urlActual = null;
  const podar = (conservar) => {
    for (const [url, p] of cache) {
      if (url === urlActual || conservar.includes(url)) continue;
      cache.delete(url);
      p.then((m) => escena.liberarModelo(m), () => {});
    }
  };

  // Todo en paralelo: modelo de MediaPipe, oclusor y el primer lente.
  let detector;
  try {
    let primero;
    [detector, primero] = await Promise.all([
      crearDetector(),
      Promise.all([escena.cargarOclusor(), obtener(urlLente)]).then(([, m]) => m),
    ]);
    escena.ponerLente(primero);
    urlActual = urlLente;
    await escena.precompilar();
  } catch (e) {
    detector?.cerrar();
    escena.liberar();
    throw e;
  }

  let dbg = null;
  if (debug) {
    const { crearDebug } = await import('./debug.js');
    dbg = crearDebug(contenedor, { escena, suavizado, opciones });
  }

  // Encuadre: recalcular si gira el celu o cambia el tamaño del video.
  const encuadrar = () => {
    const enc = calcularEncuadre(contenedor, video);
    escena.encuadrar(enc);
    puntos.encuadrar(enc);
  };
  encuadrar();
  const ro = new ResizeObserver(encuadrar);
  ro.observe(contenedor);
  video.addEventListener('resize', encuadrar);

  // iOS pausa el video al volver de otra app: lo reanudamos.
  const alVolver = () => { if (!document.hidden && video.paused) video.play().catch(() => {}); };
  document.addEventListener('visibilitychange', alVolver);

  const matCruda = new Matrix4();
  const matSuave = new Matrix4();
  let activo = true;
  let ultimaCara = -Infinity;
  let puntosSucios = false;
  let erroresSeguidos = 0;
  let ultimoTiempoVideo = -1;
  let turno = 0; // si se tocan varios lentes seguidos, gana el último

  const usarRvfc = 'requestVideoFrameCallback' in HTMLVideoElement.prototype;
  const programar = () => {
    if (!activo) return;
    if (usarRvfc) video.requestVideoFrameCallback(cuadro);
    else requestAnimationFrame(cuadroRaf);
  };
  // Sin requestVideoFrameCallback: solo procesar cuando hay un cuadro nuevo de la cámara.
  const cuadroRaf = () => {
    if (video.currentTime === ultimoTiempoVideo) return programar();
    ultimoTiempoVideo = video.currentTime;
    cuadro();
  };

  async function cuadro() {
    if (!activo) return;
    const t0 = performance.now();
    let res = null;
    try {
      res = await detector.detectar(video);
      erroresSeguidos = 0;
    } catch (e) {
      if (erroresSeguidos++ < 3) console.error('[vto] error al detectar', e);
    }
    if (!activo) return;
    if (erroresSeguidos > 30) {
      aviso('El probador no puede analizar la cámara en este equipo.');
      return programar();
    }
    const t1 = performance.now();
    const landmarks = res?.faceLandmarks?.[0];
    const matriz = res?.facialTransformationMatrixes?.[0];

    if (landmarks && matriz) {
      if (t1 - ultimaCara > MS_SIN_CARA_REINICIO) filtro.reiniciar();
      ultimaCara = t1;
      matCruda.fromArray(matriz.data);
      escena.ponerMatriz(filtro.filtrar(matCruda, t1 / 1000, matSuave));
      escena.render();
      dbg?.pose(matCruda, matSuave);
      lienzo3d.classList.add('visible');
      aviso('');
    } else {
      // Sin cara: el lente se desvanece en 150 ms (CSS), no queda congelado.
      lienzo3d.classList.remove('visible');
      dbg?.sinCara();
      if (t1 - ultimaCara > 1500) aviso('No te veo: mirá a la cámara con buena luz');
    }

    if (opciones.puntos && landmarks) { puntos.dibujar(landmarks); puntosSucios = true; }
    else if (puntosSucios) { puntos.limpiar(); puntosSucios = false; }

    if (dbg) {
      dbg.cuadro(t1 - t0);
      dbg.actualizar(`${detector.delegate} · video ${video.videoWidth}×${video.videoHeight}`);
    }
    programar();
  }
  programar();

  return {
    // Cambia el lente sin cerrar la cámara. Devuelve false si mientras tanto se eligió otro o se cerró.
    async cambiarLente(url, vecinos = []) {
      const mio = ++turno;
      const modelo = await obtener(url);
      if (!activo || mio !== turno) return false;
      escena.ponerLente(modelo);
      urlActual = url;
      podar(vecinos);
      return true;
    },

    // Descarga en segundo plano los lentes que probablemente se elijan después (anterior y siguiente).
    precargar(urls) {
      podar(urls);
      for (const u of urls) obtener(u).catch((e) => console.warn('[vto] no se pudo precargar', u, e));
    },

    estaCargado(url) { return cache.has(url); },

    cerrar() {
      activo = false;
      ro.disconnect();
      video.removeEventListener('resize', encuadrar);
      document.removeEventListener('visibilitychange', alVolver);
      dbg?.quitar();
      puntos.limpiar();
      lienzo3d.classList.remove('visible');
      detector.cerrar();
      for (const p of cache.values()) p.then((m) => escena.liberarModelo(m), () => {});
      cache.clear();
      escena.liberar();
    },
  };
}
