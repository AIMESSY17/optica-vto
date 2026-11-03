// Datos de la página (F4, T4.3): textos y lentes salen de Supabase; si falla o tarda más de 2 s,
// de los JSON locales (public/data/sitio.json y public/models/catalogo.json). También cubre el caso
// de que el proyecto gratis de Supabase esté pausado.
//
// Sin librería de Supabase (la página tiene que pesar poco, R-40): dos pedidos web a la API con la
// clave pública. Solo se leen datos públicos; los permisos los pone la base (RLS, supabase/schema.sql).
//
// ?datos=local fuerza los JSON (para probar el respaldo).

const URL_SB = import.meta.env.VITE_SUPABASE_URL;
const CLAVE = import.meta.env.VITE_SUPABASE_ANON_KEY;
const ESPERA_MS = 2000;

export async function cargarDatos(ruta) {
  const forzarLocal = new URLSearchParams(location.search).get('datos') === 'local';
  if (URL_SB && CLAVE && !forzarLocal) {
    try {
      const datos = await desdeSupabase();
      await completarUso(datos.lentes, ruta);
      return { ...datos, origen: 'supabase' };
    } catch (e) {
      console.warn('[datos] Supabase no respondió, uso los JSON locales:', e.message);
    }
  }
  return { ...(await desdeJson(ruta)), origen: 'local' };
}

// La tabla lentes de Supabase todavía no tiene la columna uso (Pantallas / Lectura, specs/tasks.md).
// Mientras tanto se toma del JSON local por código; si tampoco está, queda vacío.
async function completarUso(lentes, ruta) {
  if (lentes.every((l) => Array.isArray(l.uso))) return;
  const local = await fetch(ruta('models/catalogo.json')).then((r) => r.json()).catch(() => ({ lentes: [] }));
  for (const l of lentes) l.uso ??= local.lentes.find((x) => x.codigo === l.codigo)?.uso ?? [];
}

async function desdeJson(ruta) {
  const [sitio, catalogo] = await Promise.all([
    fetch(ruta('data/sitio.json')).then((r) => r.json()),
    fetch(ruta('models/catalogo.json')).then((r) => r.json()),
  ]);
  return { sitio, lentes: catalogo.lentes };
}

async function desdeSupabase() {
  const corte = new AbortController();
  const reloj = setTimeout(() => corte.abort(new Error(`tardó más de ${ESPERA_MS / 1000} s`)), ESPERA_MS);
  const pedir = async (consulta) => {
    const r = await fetch(`${URL_SB}/rest/v1/${consulta}`, { headers: { apikey: CLAVE }, signal: corte.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  };
  try {
    const [filasSitio, filasLentes] = await Promise.all([
      pedir('sitio?select=clave,valor'),
      // Solo llegan los visibles (RLS). Colores ordenados dentro de cada lente.
      pedir('lentes?select=*,variantes(*)&order=orden.asc&variantes.order=orden.asc'),
    ]);
    const sitio = Object.fromEntries(filasSitio.map((f) => [f.clave, f.valor]));
    if (!sitio.marca || !sitio.mensajes) throw new Error('faltan textos en la tabla sitio');
    return { sitio, lentes: filasLentes.map(aLente) };
  } finally {
    clearTimeout(reloj);
  }
}

// Fila de la base → misma forma que un lente de catalogo.json (así el resto del código no cambia).
function aLente(f) {
  const variantes = (f.variantes ?? []).map((v) => ({
    nombre: v.nombre,
    muestra: v.muestra,
    ...(v.original ? { original: true } : {}),
    ...(v.claro ? { claro: true } : {}),
    ...(v.frame ? { frame: v.frame } : {}),
  }));
  return {
    id: f.id,
    codigo: f.codigo,
    nombre: f.nombre,
    tipo: f.tipo,
    ...(Array.isArray(f.uso) ? { uso: f.uso } : {}),
    familia: f.familia,
    archivo: f.archivo,
    peso_kb: f.peso_kb,
    ancho_total_mm: Number(f.ancho_total_mm),
    colores: variantes.map((v) => v.nombre.toLowerCase()),
    variantes,
    ...(f.recolorear ? { recolorear: f.recolorear } : {}),
    ...(f.cristal ? { cristal: f.cristal } : {}),
    precio: f.precio == null ? null : Number(f.precio),
    nota: f.nota ?? '',
    credito: f.credito,
    miniaturas: { frente: f.miniatura_frente, tres_cuartos: f.miniatura_34 },
    medidas: { calibre: f.calibre, puente: f.puente, patilla: f.patilla },
  };
}
