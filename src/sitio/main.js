// Sitio de la óptica FOCO (F3, specs/04-sitio-optica.md). JS vanilla, liviano.
// Textos y lentes: de Supabase, con respaldo en public/data/sitio.json y public/models/catalogo.json (datos.js).
// El probador (three + MediaPipe) se descarga recién al tocar "Probátelos" (CLAUDE.md).
import { registrarCacheProbador } from '../vto/cache.js';
import { cargarDatos } from './datos.js';

const base = import.meta.env.BASE_URL;
const ruta = (r) => (/^https?:\/\//.test(r) ? r : base + String(r).replace(/^\//, '')); // URL completa (storage) tal cual
const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];
const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esPc = matchMedia('(min-width: 1024px) and (pointer: fine)');
const dos = (n) => String(n).padStart(2, '0');
// Versión de 1600 px de una miniatura (npm run miniaturas -- --grande). Si no existe, se vuelve a la chica.
const grande = (r) => String(r).replace(/_(frente|34)\.webp$/, '_$1_1600.webp');
const ponerGrande = (img, r) => {
  img.addEventListener('error', () => { if (img.src !== ruta(r)) img.src = ruta(r); }, { once: true });
  img.src = ruta(grande(r));
};

registrarCacheProbador();

const { sitio, lentes, origen } = await cargarDatos(ruta);
document.documentElement.dataset.datos = origen; // para revisar de dónde salieron (supabase | local)
const porCodigo = (c) => lentes.find((l) => l.codigo.toUpperCase() === String(c).toUpperCase());

// ---------------------------------------------------------------------------------------------
// WhatsApp (R-22, R-23): mensajes armados con los textos de sitio.json
const numeroWa = /^\d{10,15}$/.test(sitio.marca.whatsapp) ? sitio.marca.whatsapp : ''; // sin número real: elige el contacto
const urlWa = (texto) => `https://wa.me/${numeroWa}?text=${encodeURIComponent(texto)}`;
const plantilla = (t, datos) => t.replace(/\{(\w+)\}/g, (_, k) => datos[k] ?? '');
const linkFicha = (l) => `${location.origin}${location.pathname}#lente/${l.codigo}`;
const mensajeConsulta = (l, variante) => plantilla(sitio.mensajes.consulta, {
  nombre: l.nombre, codigo: l.codigo, color: (variante?.nombre ?? l.colores?.[0] ?? '').toLowerCase(), link: linkFicha(l),
});
const abrirWa = (texto) => window.open(urlWa(texto), '_blank', 'noopener');

// ---------------------------------------------------------------------------------------------
// Textos fijos
const textos = () => {
  const m = sitio.marca;
  $('[data-texto="rotulo"]').textContent = `${m.rubro} · ${m.ciudad}`.toUpperCase();
  $('[data-texto="hero"]').textContent = sitio.hero.texto;
  $('[data-direccion]').textContent = sitio.direccion;
  $('[data-horarios]').innerHTML = '';
  sitio.horarios.forEach((h, i) => {
    if (i) $('[data-horarios]').append(document.createElement('br'));
    $('[data-horarios]').append(`${h.dias} · ${h.horas}`);
  });
  $('[data-maps]').href = sitio.maps_url;
  for (const a of $$('[data-whatsapp-general]')) a.href = urlWa(sitio.mensajes.general);
  if (m.instagram) { const ig = $('[data-instagram]'); ig.href = m.instagram; ig.hidden = false; }
  const hecho = $('[data-hecho-por]');
  hecho.textContent = '';
  if (sitio.hecho_por.url) { const a = document.createElement('a'); a.href = sitio.hecho_por.url; a.textContent = sitio.hecho_por.texto; hecho.append(a); }
  else hecho.textContent = sitio.hecho_por.texto;
  $('[data-obras]').replaceChildren(...sitio.obras_sociales.map((o) => Object.assign(document.createElement('li'), { textContent: o })));
};

// ---------------------------------------------------------------------------------------------
// Catálogo (R-20) = lámina de análisis: Todos / Receta / Sol / Pantallas / Lectura + forma, sin recargar
const filtro = { cat: '', forma: '' };
const formaDe = (l) => Object.entries(sitio.formas).find(([, fams]) => fams.includes(l.familia))?.[0] ?? '';
const nombresColor = (l) => (l.variantes ?? []).map((v) => v.nombre);
const subtitulo = (l) => {
  const n = l.variantes?.length ?? 1;
  return `${l.tipo === 'sol' ? 'Sol' : 'Receta'} · ${n} ${n === 1 ? 'color' : 'colores'}`;
};
const enCategoria = (l, cat) => !cat || (cat === 'receta' || cat === 'sol' ? l.tipo === cat : (l.uso ?? []).includes(cat));
const GARABATOS = ['estrella', 'flecha', 'circulo', 'subrayado', '4k', 'firma', 'estrella', 'circulo'];

// Tarjeta chica (solo "Parecidos" dentro de la ficha)
function tarjeta(l) {
  const a = document.createElement('a');
  a.className = 'tarjeta';
  a.href = `#lente/${l.codigo}`;
  a.innerHTML = `<div class="tarjeta-foto"><img alt="" loading="lazy" decoding="async" width="648" height="246"><span class="codigo"></span></div>
    <div><div class="tarjeta-nombre"></div><div class="tarjeta-sub"></div></div>`;
  $('img', a).src = ruta(l.miniaturas.frente);
  $('img', a).alt = l.nombre;
  $('.codigo', a).textContent = l.codigo;
  $('.tarjeta-nombre', a).textContent = l.nombre;
  $('.tarjeta-sub', a).textContent = subtitulo(l);
  return a;
}

// Pieza de la lámina: corchetes rojos, LX/DX/F, cota con el ancho y un garabato
function pieza(l) {
  const i = lentes.indexOf(l);
  const a = document.createElement('a');
  a.className = 'pieza';
  a.href = `#lente/${l.codigo}`;
  a.innerHTML = `<div class="pieza-foto">
      <span class="rotulo pieza-lx"></span><span class="rotulo pieza-dx"></span><span class="rotulo pieza-f"></span>
      <div class="cota" aria-hidden="true"><span></span></div>
      <img alt="" loading="lazy" decoding="async" width="648" height="246">
      <span class="sombra" aria-hidden="true"></span>
      <span class="rotulo pieza-codigo"></span>
      <svg class="garabato" aria-hidden="true"><use href="#g-${GARABATOS[i % GARABATOS.length]}"/></svg>
    </div>
    <div class="pieza-pie"><div><div class="pieza-nombre"></div><div class="pieza-sub"></div></div><span class="rotulo"></span></div>`;
  $('img', a).src = ruta(l.miniaturas.frente);
  $('img', a).alt = l.nombre;
  $('.pieza-lx', a).textContent = `LX${dos(i + 1)}`;
  $('.pieza-dx', a).textContent = `DX E${dos(i + 1)}`;
  $('.pieza-f', a).textContent = `F${dos(i)}`;
  $('.cota span', a).textContent = `${l.ancho_total_mm}`;
  $('.pieza-codigo', a).textContent = l.codigo;
  $('.pieza-nombre', a).textContent = l.nombre;
  $('.pieza-sub', a).textContent = subtitulo(l);
  $('.pieza-pie .rotulo', a).textContent = `${l.ancho_total_mm} MM`;
  return a;
}

// Tira técnica: contorno de cada lente (scripts/contornos.mjs) con su cota
function armarTira() {
  $('[data-tira]').replaceChildren(...lentes.map((l) => {
    const a = document.createElement('a');
    a.className = 'tira-item';
    a.href = `#lente/${l.codigo}`;
    a.innerHTML = '<img alt="" loading="lazy" decoding="async" width="400" height="152"><div class="cota" aria-hidden="true"><span></span></div><span class="rotulo"></span>';
    const img = $('img', a);
    img.src = ruta(`models/contornos/${l.id}.png`);
    img.addEventListener('error', () => a.remove(), { once: true }); // lente nuevo sin contorno: no se muestra
    $('.cota span', a).textContent = `${l.ancho_total_mm}`;
    $('.rotulo', a).textContent = `${l.codigo} · ${l.nombre}`;
    a.setAttribute('aria-label', `${l.nombre}, ${l.ancho_total_mm} mm de ancho`);
    return a;
  }));
}

function armarFiltros() {
  const forma = $('[data-forma]');
  for (const f of Object.keys(sitio.formas)) if (lentes.some((l) => formaDe(l) === f)) forma.append(new Option(f, f));
  $('[data-filtros]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    filtro.cat = b.dataset.cat;
    pintarCatalogo();
  });
  forma.addEventListener('change', () => { filtro.forma = forma.value; pintarCatalogo(); });
  $('[data-limpiar]').addEventListener('click', () => {
    Object.assign(filtro, { cat: '', forma: '' });
    forma.value = '';
    pintarCatalogo();
  });
}

function pintarCatalogo() {
  const hay = lentes.filter((l) => enCategoria(l, filtro.cat) && (!filtro.forma || formaDe(l) === filtro.forma));
  $('[data-grilla]').replaceChildren(...hay.map(pieza));
  $('[data-grilla]').scrollLeft = 0;
  $('[data-vacio]').hidden = hay.length > 0;
  $('[data-cantidad]').textContent = `${dos(hay.length)} ${hay.length === 1 ? 'MODELO' : 'MODELOS'}`;
  for (const b of $$('[data-cat]')) b.setAttribute('aria-pressed', String(b.dataset.cat === filtro.cat));
  $('[data-forma]').closest('.chip').classList.toggle('activo', !!filtro.forma);
}

// Categorías: 4 tarjetas que filtran el catálogo
function armarCategorias() {
  const usados = new Set(); // cada tarjeta con un lente distinto, si se puede
  for (const b of $$('[data-categoria]')) {
    const cat = b.dataset.categoria;
    const de = lentes.filter((l) => enCategoria(l, cat));
    const foto = de.find((l) => !usados.has(l)) ?? de[0];
    const img = $('[data-categoria-img]', b);
    if (foto) { usados.add(foto); ponerGrande(img, foto.miniaturas.tres_cuartos); } else img.remove();
    $('[data-categoria-cant]', b).textContent = `${dos(de.length)} ${de.length === 1 ? 'MODELO' : 'MODELOS'} →`;
    b.addEventListener('click', () => {
      Object.assign(filtro, { cat, forma: '' });
      $('[data-forma]').value = '';
      pintarCatalogo();
      $('#catalogo').scrollIntoView({ behavior: reducido ? 'auto' : 'smooth' });
    });
  }
}

// ---------------------------------------------------------------------------------------------
// Servicios (R-24) y turnos (R-23)
function armarServicios() {
  $('[data-servicios]').replaceChildren(...sitio.servicios.map((s) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'fila';
    b.dataset.turno = s.motivo;
    b.innerHTML = '<span class="fila-nombre"></span><span class="fila-accion"></span>';
    $('.fila-nombre', b).textContent = s.nombre;
    $('.fila-accion', b).textContent = `${s.accion} →`;
    return b;
  }));
}

let motivo = sitio.motivos_turno[0];
function abrirTurno(preelegido) {
  if (preelegido && sitio.motivos_turno.includes(preelegido)) motivo = preelegido;
  const caja = $('[data-motivos]');
  caja.replaceChildren(...sitio.motivos_turno.map((m) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(m === motivo));
    b.classList.toggle('activo', m === motivo);
    b.textContent = m;
    b.addEventListener('click', () => { motivo = m; abrirTurno(); });
    return b;
  }));
  $('[data-turno-enviar]').href = urlWa(plantilla(sitio.mensajes.turno, { motivo: motivo.toLowerCase() }));
  if ($('[data-hoja-turno]').hidden) abrirHoja($('[data-hoja-turno]'));
}

// ---------------------------------------------------------------------------------------------
// Hojas desde abajo (ficha, turnos, créditos)
let hojaAbierta = null;
let focoPrevio = null;
function abrirHoja(hoja) {
  if (hojaAbierta && hojaAbierta !== hoja) cerrarHoja(hojaAbierta, { sinVelo: true });
  focoPrevio ??= document.activeElement;
  hojaAbierta = hoja;
  const velo = $('[data-velo]');
  velo.hidden = false;
  hoja.hidden = false;
  document.body.classList.add('trabado');
  requestAnimationFrame(() => { velo.classList.add('visible'); hoja.classList.add('visible'); });
  hoja.scrollTop = 0;
  setTimeout(() => ($('[data-cerrar]', hoja) ?? hoja).focus({ preventScroll: true }), 50);
}
function cerrarHoja(hoja = hojaAbierta, { sinVelo = false } = {}) {
  if (!hoja || hoja.hidden) return;
  hoja.classList.remove('visible');
  const fin = () => { hoja.hidden = true; };
  reducido ? fin() : setTimeout(fin, 260);
  if (hoja === hojaAbierta) hojaAbierta = null;
  if (sinVelo) return;
  const velo = $('[data-velo]');
  velo.classList.remove('visible');
  reducido ? (velo.hidden = true) : setTimeout(() => { if (!hojaAbierta) velo.hidden = true; }, 200);
  document.body.classList.remove('trabado');
  focoPrevio?.focus?.({ preventScroll: true });
  focoPrevio = null;
}

// ---------------------------------------------------------------------------------------------
// Ficha de lente (#lente/L03, R-21)
const colorFicha = new Map(); // código → índice de variante elegida
const materialDe = (l) => (nombresColor(l).some((c) => /dorado|plateado/i.test(c)) ? 'Metal' : 'Acetato');
const DIBUJO = `<svg aria-hidden="true" viewBox="0 0 64 26" width="64" height="26" fill="none" stroke="currentColor" stroke-width="1">
  <rect x="2" y="5" width="25" height="18" rx="7"/><rect x="37" y="5" width="25" height="18" rx="7"/><path d="M27 10 q5 -4 10 0"/>
  <path d="M2 2 h25 M2 0.5 v3 M27 0.5 v3" stroke="#E0301E"/></svg>`;

function pintarFicha(l) {
  const hoja = $('[data-ficha]');
  const variantes = l.variantes ?? [];
  if (!colorFicha.has(l.codigo)) colorFicha.set(l.codigo, Math.max(0, variantes.findIndex((v) => v.original)));
  const k = colorFicha.get(l.codigo);
  const med = l.medidas ?? {};
  const valor = (v) => (v == null ? '–' : v);
  hoja.className = 'hoja ficha visible';
  hoja.innerHTML = `
    <div class="manija" aria-hidden="true"></div>
    <div class="hoja-cabeza"><span class="codigo-ficha"></span><button type="button" class="cerrar" data-cerrar aria-label="Cerrar ficha">×</button></div>
    <div class="ficha-foto">
      <div class="ficha-fotos" tabindex="0" aria-label="Fotos del lente (deslizá)">
        <img width="568" height="245" decoding="async" data-f="34"><img width="640" height="261" decoding="async" loading="lazy" data-f="frente">
      </div>
      <div class="puntitos" aria-hidden="true"><i class="activo"></i><i></i></div>
      <div class="cota" aria-hidden="true"><span></span></div>
    </div>
    <h2 id="ficha-nombre"></h2>
    <div class="ficha-sub"></div>
    <dl class="medidas">
      <div><dt>CALIBRE</dt><dd>${valor(med.calibre)}</dd></div>
      <div><dt>PUENTE</dt><dd>${valor(med.puente)}</dd></div>
      <div><dt>PATILLA</dt><dd>${valor(med.patilla)}</dd></div>
      ${DIBUJO}
    </dl>
    <div class="colores" role="group" aria-label="Color"></div>
    <div class="ficha-acciones">
      <button type="button" class="boton boton-prin" data-probar-ficha>Probátelos en tu cara</button>
      <a class="boton boton-borde" target="_blank" rel="noopener" data-consultar>Consultar por WhatsApp</a>
    </div>
    <p class="nota centrada">Te llega un mensaje armado con el modelo y el color.</p>
    <div class="similares" hidden><h3>Parecidos</h3><div class="grilla"></div></div>`;
  $('.codigo-ficha', hoja).textContent = l.codigo;
  $('#ficha-nombre', hoja).textContent = l.nombre;
  $('.ficha-sub', hoja).textContent = `${l.tipo === 'sol' ? 'Sol' : 'Receta'} · ${materialDe(l)}`;
  $('.cota span', hoja).textContent = `${l.ancho_total_mm} MM`;
  const [f34, ffrente] = $$('.ficha-fotos img', hoja);
  f34.src = ruta(l.miniaturas.tres_cuartos); f34.alt = `${l.nombre}, vista tres cuartos`;
  ffrente.src = ruta(l.miniaturas.frente); ffrente.alt = `${l.nombre}, de frente`;
  const fotos = $('.ficha-fotos', hoja);
  fotos.addEventListener('scroll', () => {
    const i = Math.round(fotos.scrollLeft / Math.max(fotos.clientWidth, 1));
    $$('.puntitos i', hoja).forEach((p, j) => p.classList.toggle('activo', i === j));
  }, { passive: true });

  // Colores + precio
  const fila = $('.colores', hoja);
  const nombreColor = document.createElement('span');
  nombreColor.className = 'color-nombre';
  const precio = document.createElement('span');
  precio.className = 'precio' + (l.precio == null ? ' consultar' : '');
  precio.textContent = l.precio == null ? 'Precio: consultar' : `$ ${Number(l.precio).toLocaleString('es-AR')}`;
  const pintarColor = () => {
    const sel = colorFicha.get(l.codigo);
    $$('.color', fila).forEach((b, j) => b.setAttribute('aria-pressed', String(j === sel)));
    nombreColor.textContent = variantes[sel]?.nombre ?? '';
    $('[data-consultar]', hoja).href = urlWa(mensajeConsulta(l, variantes[sel]));
  };
  variantes.forEach((v, j) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'color' + (v.claro ? ' claro' : '');
    b.style.setProperty('--muestra', v.muestra ?? '#999');
    b.setAttribute('aria-label', v.nombre);
    b.addEventListener('click', () => { colorFicha.set(l.codigo, j); pintarColor(); });
    fila.append(b);
  });
  fila.append(nombreColor, precio);
  pintarColor();

  $('[data-probar-ficha]', hoja).addEventListener('click', () => abrirProbador(l.codigo, variantes[colorFicha.get(l.codigo)]?.nombre));

  // Parecidos: misma familia, si no misma forma, si no mismo tipo
  const otros = lentes.filter((x) => x !== l);
  const parecidos = [otros.filter((x) => x.familia === l.familia), otros.filter((x) => formaDe(x) === formaDe(l)), otros.filter((x) => x.tipo === l.tipo)]
    .find((g) => g.length)?.slice(0, 2) ?? [];
  if (parecidos.length) {
    $('.similares', hoja).hidden = false;
    $('.similares .grilla', hoja).replaceChildren(...parecidos.map(tarjeta));
  }
  hoja.classList.remove('visible');
}

let fichaPorNavegacion = false;
function rutaActual() {
  const m = location.hash.match(/^#lente\/(\w+)$/i);
  const l = m && porCodigo(m[1]);
  const hoja = $('[data-ficha]');
  if (l) {
    pintarFicha(l);
    abrirHoja(hoja);
    document.title = `${l.nombre} (${l.codigo}) · ${sitio.marca.nombre}`;
  } else if (!hoja.hidden) {
    cerrarHoja(hoja);
    document.title = sitio.seo.titulo;
  }
}
function cerrarFicha() {
  if (fichaPorNavegacion) history.back(); // vuelve a donde estaba (y el hashchange la cierra)
  else { history.replaceState(null, '', location.pathname + location.search); rutaActual(); }
}

// ---------------------------------------------------------------------------------------------
// Probador (import dinámico: three y MediaPipe recién acá)
let vtoPromesa = null, vtoModulo = null;
const cargarVto = () => (vtoPromesa ??= import('../vto/index.js').then((m) => (vtoModulo = m)));
let vtoAbierto = null;
async function abrirProbador(codigo = sitio.hero.lente, colorInicial) {
  if (vtoAbierto) return;
  const contenedor = $('#probador');
  contenedor.hidden = false;
  document.body.classList.add('trabado');
  const cerrarVista = () => {
    vtoAbierto = null;
    contenedor.hidden = true;
    contenedor.replaceChildren();
    if (!hojaAbierta) document.body.classList.remove('trabado');
  };
  try {
    // Casi siempre ya está descargado: se llama sin esperar nada, así no se pierde el toque (iOS).
    const { abrirProbador: abrir } = vtoModulo ?? (await cargarVto());
    vtoAbierto = abrir({
      contenedor, catalogo: { lentes }, idInicial: codigo, colorInicial,
      debug: new URLSearchParams(location.search).get('debug') === '1',
      onCerrar: cerrarVista,
      onConsultar: (l, variante) => abrirWa(mensajeConsulta(l, variante)),
    });
    await vtoAbierto;
  } catch (e) {
    if (e?.tipo === 'cerrado') return;
    console.error(e);
    cerrarVista();
    alert(e?.message || 'No se pudo abrir el probador.');
  }
}

// ---------------------------------------------------------------------------------------------
// Header con el tono del capítulo que tiene debajo, y WhatsApp flotante escondido en la portada (ahí están los botones).
// El resto del movimiento es CSS atado al scroll (estilos.css).
function tonos() {
  if (!('IntersectionObserver' in window)) return;
  const cabecera = $('.cabecera');
  const tono = (el) => (el.classList.contains('noche') ? 'noche' : el.classList.contains('rojo') ? 'rojo' : 'estudio');
  const alto = cabecera.offsetHeight;
  // Franja finita a la altura del medio del header: el capítulo que la cruza manda el tono
  const io = new IntersectionObserver((entradas) => {
    const e = entradas.filter((x) => x.isIntersecting).pop();
    if (!e) return;
    cabecera.classList.remove('tono-estudio', 'tono-noche', 'tono-rojo');
    cabecera.classList.add(`tono-${e.target.classList.contains('puente') ? 'estudio' : tono(e.target)}`);
  }, { rootMargin: `-${Math.round(alto / 2)}px 0px -${Math.max(innerHeight - Math.round(alto / 2) - 1, 1)}px 0px` });
  for (const c of $$('.cap')) io.observe(c);

  const flotante = $('.flotante');
  new IntersectionObserver(([e]) => {
    flotante.classList.toggle('en-portada', e.isIntersecting);
  }, { threshold: 0.35 }).observe($('.portada'));
}

// ---------------------------------------------------------------------------------------------
// Créditos 3D (R-28): salen del catálogo
function armarCreditos() {
  const lista = $('[data-lista-creditos]');
  const items = lentes.map((l) => {
    const c = l.credito;
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = c.fuente; a.target = '_blank'; a.rel = 'noopener'; a.textContent = `“${c.titulo}”`;
    li.append(a, ` por ${c.autor} — ${c.licencia.replace(/-/g, ' ')} (${l.codigo})`);
    return li;
  });
  items.push(Object.assign(document.createElement('li'), { textContent: 'Cara base “canonical_face_model” de Google MediaPipe — Apache 2.0' }));
  lista.replaceChildren(...items);
}

// ---------------------------------------------------------------------------------------------
// Arranque
textos();
armarFiltros();
pintarCatalogo();
armarTira();
armarCategorias();
armarServicios();
armarCreditos();
tonos();
$('[data-faq]').replaceChildren(...sitio.faq.map((f, i) => {
  const d = document.createElement('details');
  d.open = i === 0;
  d.innerHTML = '<summary></summary><p></p>';
  $('summary', d).textContent = f.p;
  $('p', d).textContent = f.r;
  return d;
}));

document.addEventListener('click', (e) => {
  const turno = e.target.closest('[data-turno]');
  if (turno) { e.preventDefault(); abrirTurno(turno.dataset.turno || undefined); return; }
  if (e.target.closest('[data-probar]')) { abrirProbador(); return; }
  const probarLente = e.target.closest('[data-probar-lente]');
  if (probarLente) { abrirProbador(probarLente.dataset.probarLente); return; }
  if (e.target.closest('[data-creditos]')) { abrirHoja($('[data-hoja-creditos]')); return; }
  const aFicha = e.target.closest('a[href^="#lente/"]');
  if (aFicha && hojaAbierta === $('[data-ficha]')) {
    // "Parecidos" dentro de la ficha: se reemplaza la ficha, sin sumar pasos al historial.
    e.preventDefault();
    history.replaceState(null, '', aFicha.getAttribute('href'));
    rutaActual();
    return;
  }
  if (aFicha) fichaPorNavegacion = true;
  const cerrar = e.target.closest('[data-cerrar]');
  if (cerrar || e.target.matches('[data-velo]')) {
    if (hojaAbierta === $('[data-ficha]')) cerrarFicha(); else cerrarHoja();
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || !hojaAbierta || vtoAbierto) return;
  if (hojaAbierta === $('[data-ficha]')) cerrarFicha(); else cerrarHoja();
});
addEventListener('hashchange', rutaActual);
rutaActual();
if (location.hash.startsWith('#lente/')) fichaPorNavegacion = false; // entró directo a una ficha (link de WhatsApp)

// El módulo del probador es liviano (sin three): se baja cuando la página ya cargó,
// así al tocar "Probátelos" arranca en el mismo toque (iOS pide la cámara solo así).
(window.requestIdleCallback ?? ((f) => setTimeout(f, 1200)))(() => cargarVto().catch(() => {}));

// Solo PC con mouse: cursor propio y botones magnéticos. La home no carga three (los 3D van solo en probador, catálogo y ficha).
if (esPc.matches) import('./pc.js').then((m) => m.iniciarPc({ reducido })).catch((e) => console.warn('[pc]', e));
