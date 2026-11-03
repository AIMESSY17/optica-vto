// Foto con el lente puesto (T1.5, R-08, spec 02 §10).
// A la captura (cámara + lente) se le agrega abajo una franja blanca liviana con la marca FOCO,
// el código del lente en rojo (spec 05: rojo solo en códigos) y el nombre + color.
const TINTA = '#111111', FONDO = '#FAFAF8', GRIS = '#6B6B68', ROJO = '#E0301E';
const TITULO = "'Archivo', system-ui, -apple-system, sans-serif";
const MONO = "'IBM Plex Mono', ui-monospace, Menlo, monospace";

// Devuelve un Blob JPEG listo para compartir o guardar.
export async function armarFoto(captura, { lente, variante, marca = 'FOCO' }) {
  const W = captura.width, H = captura.height;
  const u = W / 100; // unidad relativa al ancho: la franja se ve igual en cualquier resolución
  const banda = Math.round(u * 17);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H + banda;
  const ctx = c.getContext('2d');
  ctx.drawImage(captura, 0, 0);

  // Que las fuentes de la página estén listas (si no, el canvas usa la del sistema).
  try {
    await Promise.race([
      Promise.all([document.fonts.load(`800 ${u * 7}px Archivo`), document.fonts.load(`500 ${u * 3}px 'IBM Plex Mono'`)]),
      new Promise((ok) => setTimeout(ok, 800)),
    ]);
  } catch { /* sin fuentes web: queda la del sistema */ }

  ctx.fillStyle = FONDO;
  ctx.fillRect(0, H, W, banda);
  const m = u * 6; // margen lateral
  const medio = H + banda / 2;

  // Izquierda: la marca.
  ctx.fillStyle = TINTA;
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${u * 7}px ${TITULO}`;
  ctx.fillText(marca, m, medio);

  // Derecha: código en rojo arriba, nombre y color abajo.
  ctx.textAlign = 'right';
  ctx.fillStyle = ROJO;
  ctx.font = `500 ${u * 2.8}px ${MONO}`;
  ctx.fillText(lente.codigo, W - m, medio - u * 2.6);
  ctx.fillStyle = TINTA;
  ctx.font = `600 ${u * 3.8}px ${TITULO}`;
  const nombre = variante && !lente.nombre.toLowerCase().includes(variante.nombre.toLowerCase())
    ? `${lente.nombre} · ${variante.nombre}` : lente.nombre;
  ctx.fillText(nombre, W - m, medio + u * 2.4, W - m * 2 - u * 24);

  // Microtexto: el probador es virtual.
  ctx.textAlign = 'left';
  ctx.fillStyle = GRIS;
  ctx.font = `500 ${u * 2.2}px ${MONO}`;
  ctx.fillText('PROBADOR VIRTUAL', m, medio + u * 5.2);

  return new Promise((ok, mal) => c.toBlob((b) => (b ? ok(b) : mal(new Error('No se pudo armar la foto'))), 'image/jpeg', 0.9));
}

export const nombreArchivo = (lente) => `foco-${lente.codigo.toLowerCase()}.jpg`;

// ¿Se puede compartir un archivo con el menú del sistema (Web Share nivel 2)?
export function puedeCompartir(archivo) {
  try { return !!navigator.canShare?.({ files: [archivo] }); } catch { return false; }
}

// Compartir. Llamar directo desde un toque (iOS exige el gesto). Devuelve false si hay que caer a descargar.
export async function compartir(archivo, titulo) {
  try {
    await navigator.share({ files: [archivo], title: titulo });
    return true;
  } catch (e) {
    if (e.name === 'AbortError') return true; // la persona cerró el menú: no es un error
    console.warn('[vto] no se pudo compartir', e);
    return false;
  }
}

export function descargar(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
