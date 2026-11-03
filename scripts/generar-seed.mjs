// Genera supabase/seed.sql desde public/models/catalogo.json y public/data/sitio.json (F4, T4.1).
// El SQL carga (o vuelve a cargar) los lentes de la demo, sus colores y los textos del sitio.
//
// Uso:  npm run seed      → escribe supabase/seed.sql (después se pega en Supabase → SQL Editor)
//
// Ojo: correr el seed PISA lo que se haya editado en el panel para esos lentes y textos.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const leer = (r) => JSON.parse(readFileSync(path.join(raiz, r), 'utf8'));
const catalogo = leer('public/models/catalogo.json');
const sitio = leer('public/data/sitio.json');

// Valores SQL: texto con comillas escapadas, null, números, booleanos, jsonb y text[].
const texto = (v) => (v == null || v === '' ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const num = (v) => (v == null || v === '' ? 'null' : String(Number(v)));
const bool = (v) => (v ? 'true' : 'false');
const json = (v) => (v == null ? 'null' : `${texto(JSON.stringify(v))}::jsonb`);
const lista = (v) => (v?.length ? `array[${v.map(texto).join(', ')}]::text[]` : 'null');

const lentes = catalogo.lentes;
const ids = lentes.map((l) => texto(l.id)).join(', ');

const filasLentes = lentes.map((l, i) => `  (${[
  texto(l.id), texto(l.codigo), texto(l.nombre), texto(l.tipo), texto(l.familia), texto(l.archivo),
  texto(l.miniaturas.frente), texto(l.miniaturas.tres_cuartos), num(l.peso_kb), num(l.ancho_total_mm),
  num(l.medidas?.calibre), num(l.medidas?.puente), num(l.medidas?.patilla), num(l.precio),
  'true', String((i + 1) * 10), lista(l.recolorear), json(l.cristal), json(l.credito), texto(l.nota),
].join(', ')})`);

const filasVariantes = lentes.flatMap((l) => (l.variantes ?? []).map((v, j) => `  (${[
  texto(l.id), String((j + 1) * 10), texto(v.nombre), texto(v.muestra), bool(v.original), bool(v.claro), json(v.frame),
].join(', ')})`));

const filasSitio = Object.entries(sitio)
  .filter(([clave]) => !clave.startsWith('_'))
  .map(([clave, valor]) => `  (${texto(clave)}, ${json(valor)})`);

const sql = `-- =============================================================================================
-- FOCO · Datos de la demo (F4, T4.1). GENERADO por scripts/generar-seed.mjs — no editar a mano.
-- Fuente: public/models/catalogo.json + public/data/sitio.json
-- Se pega en Supabase → SQL Editor → Run, DESPUÉS de schema.sql. Se puede volver a correr.
-- Ojo: vuelve a dejar los ${lentes.length} lentes y los textos como en los JSON (pisa lo editado en el panel).
-- =============================================================================================

begin;

-- 1. Lentes (si ya existen, se actualizan)
insert into public.lentes (id, codigo, nombre, tipo, familia, archivo, miniatura_frente, miniatura_34, peso_kb,
  ancho_total_mm, calibre, puente, patilla, precio, visible, orden, recolorear, cristal, credito, nota)
values
${filasLentes.join(',\n')}
on conflict (id) do update set
  codigo = excluded.codigo, nombre = excluded.nombre, tipo = excluded.tipo, familia = excluded.familia,
  archivo = excluded.archivo, miniatura_frente = excluded.miniatura_frente, miniatura_34 = excluded.miniatura_34,
  peso_kb = excluded.peso_kb, ancho_total_mm = excluded.ancho_total_mm, calibre = excluded.calibre,
  puente = excluded.puente, patilla = excluded.patilla, precio = excluded.precio, visible = excluded.visible,
  orden = excluded.orden, recolorear = excluded.recolorear, cristal = excluded.cristal,
  credito = excluded.credito, nota = excluded.nota;

-- 2. Colores: se borran los de estos lentes y se cargan de nuevo
delete from public.variantes where lente_id in (${ids});

insert into public.variantes (lente_id, orden, nombre, muestra, original, claro, frame)
values
${filasVariantes.join(',\n')};

-- 3. Textos del sitio (una fila por bloque)
insert into public.sitio (clave, valor)
values
${filasSitio.join(',\n')}
on conflict (clave) do update set valor = excluded.valor;

commit;

-- Control: tiene que dar ${lentes.length} lentes, ${filasVariantes.length} colores y ${filasSitio.length} bloques de texto.
select
  (select count(*) from public.lentes    where id in (${ids})) as lentes,
  (select count(*) from public.variantes where lente_id in (${ids})) as colores,
  (select count(*) from public.sitio) as textos;
`;

writeFileSync(path.join(raiz, 'supabase/seed.sql'), sql);
console.log(`supabase/seed.sql: ${lentes.length} lentes, ${filasVariantes.length} colores, ${filasSitio.length} bloques de texto.`);
