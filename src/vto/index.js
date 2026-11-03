// Probador virtual: API pública (spec 02 "API del módulo").
// La página lo abre con import('./vto/index.js'). Este archivo es liviano: three y MediaPipe
// viven en motor.js y se descargan recién al llamar a abrirProbador().
//
//   const vto = await abrirProbador({ contenedor, catalogo, idInicial, onConsultar, onCerrar, debug });
//   vto.cambiarLente(id); vto.cambiarColor(variante); vto.sacarFoto(); vto.cerrar();
//   onConsultar(lente, variante) recibe el lente y el color elegidos (para el mensaje de WhatsApp).
import './probador.css';
import { abrirCamara, cerrarCamara, ErrorCamara } from './camara.js';
import { crearUi, rutaPublica } from './ui.js';

export { ErrorCamara };

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

  const ui = crearUi(contenedor, {
    lentes,
    onElegir: (i) => api.cambiarLente(lentes[i].id),
    onColor: (k) => api.cambiarColor(k),
    onCerrar: () => { api.cerrar(); onCerrar?.(); },
    onConsultar: () => onConsultar?.(lentes[indice], varianteDe(indice)),
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

  const api = {
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

    // T1.5
    async sacarFoto() { console.warn('[vto] sacarFoto llega en T1.5'); return null; },

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

  // La cámara se pide antes de cualquier espera; el motor se descarga en paralelo.
  const camara = abrirCamara(ui.video);
  const modulo = import('./motor.js');
  modulo.catch(() => {});

  try {
    stream = await camara;
    if (cerrado) { cerrarCamara(ui.video, stream); throw new ErrorCamara('cerrado', 'Se cerró el probador'); }
    ui.aviso('Cargando el probador…');
    const { iniciarMotor } = await modulo;
    const inicial = indice;
    const m = await iniciarMotor({
      contenedor: ui.raiz, video: ui.video, lienzo3d: ui.lienzo3d, lienzo2d: ui.lienzo2d,
      aviso: ui.aviso, lente: pedidoDe(inicial), debug,
    });
    if (cerrado) { m.cerrar(); throw new ErrorCamara('cerrado', 'Se cerró el probador'); }
    motor = m;
    ui.aviso('');
    // Si eligieron otro lente o color mientras cargaba, ponerlo ahora; si no, precargar los vecinos.
    if (indice !== inicial) api.cambiarLente(lentes[indice].id);
    else { motor.cambiarColor(varianteDe(indice)); motor.precargar(vecinos(inicial)); }
    return api;
  } catch (e) {
    api.cerrar();
    throw e;
  }
}
