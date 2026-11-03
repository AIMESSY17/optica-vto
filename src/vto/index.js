// Probador virtual: API pública (spec 02 "API del módulo").
// La página lo abre con import('./vto/index.js'). Este archivo es liviano: three y MediaPipe
// viven en motor.js y se descargan recién al llamar a abrirProbador().
//
//   const vto = await abrirProbador({ contenedor, catalogo, idInicial, onConsultar, onCerrar, debug });
//   vto.cambiarLente(id); vto.cambiarColor(variante); vto.sacarFoto(); vto.cerrar();
//   onConsultar(lente, variante) recibe el lente y el color elegidos (para el mensaje de WhatsApp).
//   vto.modo: 'video' (cámara) o 'imagen' (plan B con selfie, R-09).
import './probador.css';
import { abrirCamara, cerrarCamara, ErrorCamara } from './camara.js';
import { crearUi, rutaPublica } from './ui.js';
import { armarFoto, compartir, descargar, nombreArchivo, puedeCompartir } from './foto.js';

export { ErrorCamara };

// Por qué no hay cámara, dicho para la persona (se muestra en la tarjeta del plan B).
const MOTIVOS = {
  permiso: 'No diste permiso para usar la cámara. Podés habilitarla en el navegador o probártelos con una selfie.',
  'sin-camara': 'No encontramos una cámara en este equipo. Probátelos con una foto tuya de frente.',
  'sin-soporte': 'Este navegador no deja usar la cámara. Probátelos con una foto tuya de frente.',
  https: 'Este navegador no deja usar la cámara. Probátelos con una foto tuya de frente.',
  ocupada: 'La cámara está ocupada por otra app. Cerrala y volvé a abrir el probador, o usá una selfie.',
};
const SIN_CARA = 'No encontramos una cara en esa foto. Probá con otra de frente, con buena luz y sin taparte los ojos.';
const LADO_MAX_SELFIE = 1280; // px: más grande no mejora la detección y gasta memoria

// Llamar directo desde el toque del usuario, sin esperas antes: iOS pide la cámara solo dentro del toque.
export async function abrirProbador({ contenedor, catalogo, idInicial, onConsultar, onCerrar, debug = false }) {
  const lentes = catalogo.lentes;
  if (!lentes?.length) throw new Error('El catálogo no tiene lentes');
  let indice = Math.max(0, lentes.findIndex((l) => l.id === idInicial || l.codigo === idInicial));

  // Color elegido por lente (índice en `variantes`). Arranca en el que es como viene el modelo.
  const colorElegido = lentes.map((l) => Math.max(0, (l.variantes ?? []).findIndex((v) => v.original)));
  const varianteDe = (i) => lentes[i].variantes?.[colorElegido[i]] ?? null;

  let cerrado = false;
  let stream = null;
  let motor = null;
  let modo = 'video';

  const ui = crearUi(contenedor, {
    lentes,
    onElegir: (i) => api.cambiarLente(lentes[i].id),
    onColor: (k) => api.cambiarColor(k),
    onCerrar: () => { api.cerrar(); onCerrar?.(); },
    onConsultar: () => onConsultar?.(lentes[indice], varianteDe(indice)),
    onFoto: () => fotoDesdeBoton(),
    onSelfie: (archivo) => usarSelfie(archivo),
  });
  const marcar = (opts) => { ui.marcar(indice, opts); ui.marcarColor(colorElegido[indice]); };
  marcar({ suave: false });
  requestAnimationFrame(() => ui.marcar(indice, { suave: false })); // por si el contenedor recién se mostró
  ui.aviso('Abriendo la cámara…');

  const pedidoDe = (i) => ({ url: rutaPublica(lentes[i].archivo), info: lentes[i], variante: varianteDe(i) });
  const vecinos = (i) => {
    const n = lentes.length;
    return [...new Set([(i - 1 + n) % n, (i + 1) % n])].filter((k) => k !== i).map(pedidoDe);
  };

  // El motor se descarga ya, en paralelo con la cámara (o mientras eligen la selfie).
  const modulo = import('./motor.js');
  modulo.catch(() => {});
  const arrancarMotor = async (fuente, modoMotor) => {
    const { iniciarMotor } = await modulo;
    const m = await iniciarMotor({
      contenedor: ui.raiz, fuente, modo: modoMotor, lienzo3d: ui.lienzo3d, lienzo2d: ui.lienzo2d,
      aviso: ui.aviso, lente: pedidoDe(indice), debug,
    });
    if (cerrado) { m.cerrar(); throw new ErrorCamara('cerrado', 'Se cerró el probador'); }
    return m;
  };

  const api = {
    get modo() { return modo; },

    // Cambia de lente sin cerrar la cámara (R-06). Con el anterior/siguiente precargados es inmediato.
    async cambiarLente(id) {
      const i = lentes.findIndex((l) => l.id === id || l.codigo === id);
      if (i < 0 || cerrado) return;
      indice = i;
      marcar();
      if (!motor) return; // todavía cargando: al terminar se pone el último elegido
      const pedido = pedidoDe(i);
      if (!motor.estaCargado(pedido.url)) ui.cargando(i, true);
      try {
        const puesto = await motor.cambiarLente(pedido, vecinos(i));
        if (puesto) motor.precargar(vecinos(i));
      } catch (e) {
        console.error('[vto] no se pudo cargar el lente', e);
        if (indice === i) ui.aviso('No se pudo cargar este lente. Probá de nuevo.');
      } finally {
        ui.cargando(i, false);
      }
    },

    // Cambia el color del marco en vivo (R-07). `variante`: índice, nombre o el objeto del catálogo.
    cambiarColor(variante) {
      const lista = lentes[indice].variantes ?? [];
      const k = typeof variante === 'number' ? variante
        : lista.findIndex((v) => v === variante || v.nombre === variante || v.nombre === variante?.nombre);
      if (k < 0 || k >= lista.length || cerrado) return;
      colorElegido[indice] = k;
      ui.marcarColor(k);
      motor?.cambiarColor(lista[k]); // si todavía carga, se aplica al terminar (va en el pedido)
    },

    // Foto con el lente puesto y la marca FOCO (R-08). Devuelve un Blob JPEG (o null si todavía no hay motor).
    async sacarFoto() {
      if (!motor || cerrado) return null;
      return armarFoto(motor.capturar(), { lente: lentes[indice], variante: varianteDe(indice) });
    },

    // Libera cámara, GPU y DOM.
    cerrar() {
      if (cerrado) return;
      cerrado = true;
      motor?.cerrar();
      motor = null;
      cerrarCamara(ui.video, stream);
      stream = null;
      ui.quitar();
    },
  };

  // Botón "Sacar foto": destello, vista previa y Compartir / Guardar.
  // Compartir se toca en la vista previa: iOS solo abre el menú si es justo en un toque.
  let sacando = false;
  async function fotoDesdeBoton() {
    if (sacando || !motor) return;
    sacando = true;
    ui.destello();
    try {
      const lente = lentes[indice];
      const blob = await api.sacarFoto();
      if (!blob || cerrado) return;
      const nombre = nombreArchivo(lente);
      const archivo = new File([blob], nombre, { type: 'image/jpeg' });
      const titulo = `FOCO · ${lente.codigo} ${lente.nombre}`;
      ui.mostrarFoto(blob, puedeCompartir(archivo)
        ? { texto: 'Compartir', alTocar: async () => { if (!(await compartir(archivo, titulo))) descargar(blob, nombre); } }
        : { texto: 'Guardar', alTocar: () => descargar(blob, nombre) });
    } catch (e) {
      console.error('[vto] no se pudo sacar la foto', e);
      ui.aviso('No se pudo sacar la foto. Probá de nuevo.');
    } finally {
      sacando = false;
    }
  }

  // Plan B (R-09): una selfie en lugar de la cámara. Se puede cambiar de foto las veces que quieran.
  let colaSelfie = Promise.resolve();
  function usarSelfie(archivo) {
    colaSelfie = colaSelfie.then(async () => {
      if (cerrado) return;
      ui.ocultarPlanB();
      ui.fotoHabilitada(false);
      ui.aviso('Analizando la foto…');
      try {
        const canvas = await leerSelfie(archivo);
        if (cerrado) return;
        ui.ponerImagen(canvas);
        if (!motor) {
          motor = await arrancarMotor(canvas, 'imagen');
          motor.precargar(vecinos(indice));
        }
        if (motor.ponerImagen(canvas)) {
          ui.aviso('');
          ui.fotoHabilitada(true);
        } else {
          ui.aviso('');
          ui.mostrarPlanB(SIN_CARA);
        }
      } catch (e) {
        if (e.tipo === 'cerrado') return;
        console.error('[vto] no se pudo usar la selfie', e);
        ui.aviso('');
        ui.mostrarPlanB('No pudimos abrir esa foto. Probá con otra.');
      }
    });
    return colaSelfie;
  }

  try {
    stream = await abrirCamara(ui.video);
  } catch (e) {
    if (cerrado) throw new ErrorCamara('cerrado', 'Se cerró el probador');
    if (!(e instanceof ErrorCamara)) { api.cerrar(); throw e; }
    // Sin cámara: el probador sigue abierto con la opción de la selfie.
    modo = 'imagen';
    ui.aviso('');
    ui.mostrarPlanB(MOTIVOS[e.tipo] ?? `${e.message} Probátelos con una selfie.`);
    return api;
  }

  try {
    if (cerrado) { cerrarCamara(ui.video, stream); throw new ErrorCamara('cerrado', 'Se cerró el probador'); }
    ui.aviso('Cargando el probador…');
    const inicial = indice;
    motor = await arrancarMotor(ui.video, 'video');
    ui.aviso('');
    ui.fotoHabilitada(true);
    // Si eligieron otro lente o color mientras cargaba, ponerlo ahora; si no, precargar los vecinos.
    if (indice !== inicial) api.cambiarLente(lentes[indice].id);
    else { motor.cambiarColor(varianteDe(indice)); motor.precargar(vecinos(inicial)); }
    return api;
  } catch (e) {
    api.cerrar();
    throw e;
  }
}

// Lee la selfie en un <canvas> (achicada). Con <img> el navegador ya respeta la orientación de la foto (EXIF).
async function leerSelfie(archivo) {
  const url = URL.createObjectURL(archivo);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const k = Math.min(1, LADO_MAX_SELFIE / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * k);
    c.height = Math.round(img.naturalHeight * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c;
  } finally {
    URL.revokeObjectURL(url);
  }
}
