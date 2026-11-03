// Motor del probador: une cámara, MediaPipe, suavizado y Three.js (spec 02).
// Es la parte pesada (three + mediapipe): index.js lo importa recién al abrir el probador.
//
// Dos modos:
//   'video'  → cámara en vivo, espejada (lo normal).
//   'imagen' → plan B (R-09): una selfie fija. Se detecta la cara una vez y se dibuja sin espejar.
import { Matrix4 } from 'three';
import { crearDetector } from './detector.js';
import { crearEscena } from './escena.js';
import { calcularEncuadre } from './encuadre.js';
import { crearPuntos } from './puntos.js';
import { FiltroPose } from './one-euro.js';
import { MS_SIN_CARA_REINICIO, SUAVIZADO } from './constantes.js';

// `fuente` = <video> (modo video) o un <canvas> con la selfie (modo imagen).
// `lente` = { url, info, variante }: url del GLB, su entrada del catálogo y el color elegido.
export async function iniciarMotor({ contenedor, fuente, modo = 'video', lienzo3d, lienzo2d, aviso, lente, debug }) {
  const enVivo = modo === 'video';
  const escena = crearEscena(lienzo3d);
  const puntos = crearPuntos(lienzo2d);
  const suavizado = { ...SUAVIZADO };
  const filtro = new FiltroPose(suavizado);
  const opciones = { oclusor: false, puntos: debug, lente: true };

  // Caché de lentes (R-06): url → promesa del modelo ya cargado y con los shaders listos.
  // Se queda con el lente puesto y sus vecinos del carrusel; el resto se libera.
  const cache = new Map();
  const obtener = ({ url, info }) => {
    if (!cache.has(url)) {
      const p = escena.cargarModelo(url, info).then(async (m) => { await escena.precompilarModelo(m); return m; });
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
      crearDetector({ runningMode: enVivo ? 'VIDEO' : 'IMAGE' }),
      Promise.all([escena.cargarOclusor(), obtener(lente)]).then(([, m]) => m),
    ]);
    escena.ponerLente(primero, lente.variante);
    urlActual = lente.url;
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

  // Encuadre: recalcular si gira el celu o cambia el tamaño de la fuente.
  let enc = null;
  const encuadrar = () => {
    enc = calcularEncuadre(contenedor, fuente);
    escena.encuadrar(enc);
    puntos.encuadrar(enc);
  };
  encuadrar();
  const ro = new ResizeObserver(encuadrar);
  ro.observe(contenedor);
  if (enVivo) fuente.addEventListener('resize', encuadrar);

  // iOS pausa el video al volver de otra app: lo reanudamos.
  const alVolver = () => { if (enVivo && !document.hidden && fuente.paused) fuente.play().catch(() => {}); };
  document.addEventListener('visibilitychange', alVolver);

  const matCruda = new Matrix4();
  const matSuave = new Matrix4();
  let activo = true;
  let ultimaCara = -Infinity;
  let hayCara = false;
  let puntosSucios = false;
  let erroresSeguidos = 0;
  let ultimoTiempoVideo = -1;
  let turno = 0; // si se tocan varios lentes seguidos, gana el último
  let landmarksFoto = null;

  const lienzo = () => escena.renderer.domElement;
  const dibujarPuntos = (landmarks) => {
    if (opciones.puntos && landmarks) { puntos.dibujar(landmarks); puntosSucios = true; }
    else if (puntosSucios) { puntos.limpiar(); puntosSucios = false; }
  };

  // --- Modo video: un cuadro de detección por cada cuadro de la cámara ---
  const usarRvfc = 'requestVideoFrameCallback' in HTMLVideoElement.prototype;
  const programar = () => {
    if (!activo) return;
    if (usarRvfc) fuente.requestVideoFrameCallback(cuadro);
    else requestAnimationFrame(cuadroRaf);
  };
  // Sin requestVideoFrameCallback: solo procesar cuando hay un cuadro nuevo de la cámara.
  const cuadroRaf = () => {
    if (fuente.currentTime === ultimoTiempoVideo) return programar();
    ultimoTiempoVideo = fuente.currentTime;
    cuadro();
  };

  async function cuadro() {
    if (!activo) return;
    const t0 = performance.now();
    let res = null;
    try {
      res = await detector.detectar(fuente);
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
      hayCara = true;
      matCruda.fromArray(matriz.data);
      escena.ponerMatriz(filtro.filtrar(matCruda, t1 / 1000, matSuave));
      escena.render();
      dbg?.pose(matCruda, matSuave);
      lienzo().classList.add('visible');
      aviso('');
    } else {
      // Sin cara: el lente se desvanece en 150 ms (CSS), no queda congelado.
      hayCara = false;
      lienzo().classList.remove('visible');
      dbg?.sinCara();
      if (t1 - ultimaCara > 1500) aviso('No te veo: mirá a la cámara con buena luz');
    }
    dibujarPuntos(landmarks);

    if (dbg) {
      dbg.cuadro(t1 - t0);
      dbg.actualizar(`${detector.delegate} · video ${fuente.videoWidth}×${fuente.videoHeight}`);
    }
    programar();
  }

  // --- Modo imagen: la pose es fija; se vuelve a dibujar en cada cuadro de pantalla
  // (así cambiar lente, color o un slider de debug se ve al instante) ---
  let rafImagen = 0;
  const dibujarImagen = () => {
    if (!activo) return;
    if (hayCara) escena.render();
    dibujarPuntos(landmarksFoto);
    rafImagen = requestAnimationFrame(dibujarImagen);
  };

  if (enVivo) programar();
  else rafImagen = requestAnimationFrame(dibujarImagen);

  return {
    // Cambia el lente sin cerrar la cámara. Devuelve false si mientras tanto se eligió otro o se cerró.
    // `vecinos` = lentes ({ url, info }) que conviene no liberar.
    async cambiarLente(pedido, vecinos = []) {
      const mio = ++turno;
      const modelo = await obtener(pedido);
      if (!activo || mio !== turno) return false;
      escena.ponerLente(modelo, pedido.variante);
      urlActual = pedido.url;
      podar(vecinos.map((v) => v.url));
      return true;
    },

    // Cambia el color del marco del lente puesto, en vivo (T1.4).
    cambiarColor(variante) { escena.ponerVariante(variante); },

    // Descarga en segundo plano los lentes que probablemente se elijan después (anterior y siguiente).
    precargar(lentes) {
      podar(lentes.map((l) => l.url));
      for (const l of lentes) obtener(l).catch((e) => console.warn('[vto] no se pudo precargar', l.url, e));
    },

    estaCargado(url) { return cache.has(url); },

    // Modo imagen: busca la cara en la selfie (un <canvas>). Devuelve false si no encontró ninguna.
    ponerImagen(canvas) {
      fuente = canvas;
      encuadrar();
      const res = detector.detectarImagen(canvas);
      const landmarks = res?.faceLandmarks?.[0];
      const matriz = res?.facialTransformationMatrixes?.[0];
      hayCara = !!(landmarks && matriz);
      landmarksFoto = hayCara ? landmarks : null;
      if (hayCara) escena.ponerMatriz(matCruda.fromArray(matriz.data));
      lienzo().classList.toggle('visible', hayCara);
      return hayCara;
    },

    // Foto (R-08): lo que se ve en pantalla (fuente + lente), al tamaño real de la fuente.
    // Devuelve un <canvas>; el marco FOCO lo agrega foto.js.
    capturar() {
      const escala = enc.anchoTotal / enc.videoAncho; // px de pantalla por px de la fuente
      const sx = enc.offsetX / escala, sy = enc.offsetY / escala;
      const sw = enc.ancho / escala, sh = enc.alto / escala;
      // Si la fuente es chica, agrandar hasta la nitidez del 3D en pantalla.
      const k = Math.max(1, (enc.alto * escena.renderer.getPixelRatio()) / sh);
      const out = document.createElement('canvas');
      out.width = Math.round(sw * k);
      out.height = Math.round(sh * k);
      const ctx = out.getContext('2d');
      if (enVivo) { ctx.translate(out.width, 0); ctx.scale(-1, 1); } // igual que en pantalla
      ctx.drawImage(fuente, sx, sy, sw, sh, 0, 0, out.width, out.height);
      if (hayCara && opciones.lente) {
        escena.render(); // el canvas 3D se lee justo después de dibujar
        ctx.drawImage(lienzo(), 0, 0, out.width, out.height);
      }
      return out;
    },

    cerrar() {
      activo = false;
      cancelAnimationFrame(rafImagen);
      ro.disconnect();
      if (enVivo) fuente.removeEventListener('resize', encuadrar);
      document.removeEventListener('visibilitychange', alVolver);
      dbg?.quitar();
      puntos.limpiar();
      lienzo().classList.remove('visible');
      detector.cerrar();
      for (const p of cache.values()) p.then((m) => escena.liberarModelo(m), () => {});
      cache.clear();
      escena.liberar();
    },
  };
}
