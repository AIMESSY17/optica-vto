-- =============================================================================================
-- FOCO · Esquema de Supabase (F4, T4.1)
-- Se pega entero en Supabase → SQL Editor → Run. Se puede volver a correr sin romper nada.
-- No contiene claves ni contraseñas.
-- =============================================================================================


-- ---------------------------------------------------------------------------------------------
-- 1. Admins: quién puede editar. Un mail por fila.
-- ---------------------------------------------------------------------------------------------
create table if not exists public.admins (
  email text primary key check (email = lower(email))
);

-- Mail del usuario creado a mano en Authentication → Users (en minúsculas).
insert into public.admins (email) values ('javierbaezmvsss@gmail.com')
on conflict (email) do nothing;

-- ¿El usuario logueado es admin? Lee el mail del token de login y lo busca en admins.
-- "security definer" = puede mirar la tabla admins aunque el usuario no tenga permiso de leerla.
create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.es_admin() from public;
grant execute on function public.es_admin() to anon, authenticated;


-- ---------------------------------------------------------------------------------------------
-- 2. Lentes: una fila por modelo del catálogo.
-- ---------------------------------------------------------------------------------------------
create table if not exists public.lentes (
  id               text primary key,                          -- ej. optico-acetato-negro (= nombre del GLB)
  codigo           text not null unique,                      -- ej. L01
  nombre           text not null,
  tipo             text not null check (tipo in ('receta', 'sol')),
  familia          text not null,                             -- ej. cuadrado-grueso (para el filtro Forma)
  archivo          text not null,                             -- ruta o URL del GLB
  miniatura_frente text not null,
  miniatura_34     text not null,
  peso_kb          integer,
  ancho_total_mm   numeric not null check (ancho_total_mm > 0),
  calibre          integer check (calibre between 30 and 70),  -- medidas que carga la óptica (52□18 140)
  puente           integer check (puente between 10 and 30),
  patilla          integer check (patilla between 100 and 160),
  precio           numeric check (precio >= 0),               -- null = "Consultar precio"
  visible          boolean not null default true,             -- false = oculto en la página
  orden            integer not null default 0,
  recolorear       text[],                                    -- FRAME_* que cambian de color (null = todos los opacos)
  cristal          jsonb,                                     -- ej. {"tinte": "#2F3229"}
  credito          jsonb,                                     -- autor, licencia, fuente del modelo 3D
  nota             text,
  actualizado      timestamptz not null default now()
);


-- ---------------------------------------------------------------------------------------------
-- 3. Variantes: los colores de cada lente.
-- ---------------------------------------------------------------------------------------------
create table if not exists public.variantes (
  id          bigint generated always as identity primary key,
  lente_id    text not null references public.lentes (id) on update cascade on delete cascade,
  orden       integer not null default 0,
  nombre      text not null,                                  -- ej. Carey
  muestra     text not null check (muestra ~ '^#[0-9A-Fa-f]{6}$'),  -- color del circulito
  original    boolean not null default false,                 -- true = el color tal cual viene en el modelo
  claro       boolean not null default false,                 -- true = marco translúcido (acetato cristal)
  frame       jsonb,                                          -- cómo se pinta el marco: color, roughness, etc.
  unique (lente_id, nombre)
);

create index if not exists variantes_lente_idx on public.variantes (lente_id, orden);


-- ---------------------------------------------------------------------------------------------
-- 4. Sitio: los textos de la página (lo mismo que public/data/sitio.json).
--    Una fila por bloque: marca, seo, hero, direccion, horarios, obras_sociales, faq, mensajes...
-- ---------------------------------------------------------------------------------------------
create table if not exists public.sitio (
  clave       text primary key,
  valor       jsonb not null,
  actualizado timestamptz not null default now()
);


-- ---------------------------------------------------------------------------------------------
-- 5. Fecha de última edición automática.
-- ---------------------------------------------------------------------------------------------
create or replace function public.marcar_actualizado()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado = now();
  return new;
end;
$$;

drop trigger if exists lentes_actualizado on public.lentes;
create trigger lentes_actualizado before update on public.lentes
  for each row execute function public.marcar_actualizado();

drop trigger if exists sitio_actualizado on public.sitio;
create trigger sitio_actualizado before update on public.sitio
  for each row execute function public.marcar_actualizado();


-- ---------------------------------------------------------------------------------------------
-- 6. Permisos (RLS): cualquiera lee, solo admins escriben.
-- ---------------------------------------------------------------------------------------------
alter table public.admins    enable row level security;
alter table public.lentes    enable row level security;
alter table public.variantes enable row level security;
alter table public.sitio     enable row level security;

grant select on public.lentes, public.variantes, public.sitio to anon, authenticated;
grant insert, update, delete on public.lentes, public.variantes, public.sitio to authenticated;
grant usage on sequence public.variantes_id_seq to authenticated;
-- admins: nadie la lee ni la toca desde la página; se edita solo desde el SQL Editor.
revoke all on public.admins from anon, authenticated;

-- Lentes: el público ve los visibles; el admin ve todos (también los ocultos).
drop policy if exists "lentes: leer" on public.lentes;
create policy "lentes: leer" on public.lentes
  for select to anon, authenticated
  using (visible or (select public.es_admin()));

drop policy if exists "lentes: admin escribe" on public.lentes;
create policy "lentes: admin escribe" on public.lentes
  for all to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

-- Variantes: se ven si se ve su lente (los colores de un lente oculto quedan ocultos también,
-- porque la regla de lentes se aplica adentro del exists). Escritura solo admin.
drop policy if exists "variantes: leer" on public.variantes;
create policy "variantes: leer" on public.variantes
  for select to anon, authenticated
  using (exists (
    select 1 from public.lentes l
    where l.id = lente_id
  ));

drop policy if exists "variantes: admin escribe" on public.variantes;
create policy "variantes: admin escribe" on public.variantes
  for all to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

drop policy if exists "sitio: leer" on public.sitio;
create policy "sitio: leer" on public.sitio
  for select to anon, authenticated
  using (true);

drop policy if exists "sitio: admin escribe" on public.sitio;
create policy "sitio: admin escribe" on public.sitio
  for all to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));


-- ---------------------------------------------------------------------------------------------
-- 7. Storage: bucket "modelos" para GLB y miniaturas.
--    Público para leer (links directos), subir/cambiar/borrar solo admins. Máx. 5 MB por archivo.
-- ---------------------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('modelos', 'modelos', true, 5242880,
        array['model/gltf-binary', 'application/octet-stream', 'image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "modelos: leer" on storage.objects;
create policy "modelos: leer" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'modelos');

drop policy if exists "modelos: admin sube" on storage.objects;
create policy "modelos: admin sube" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'modelos' and (select public.es_admin()));

drop policy if exists "modelos: admin cambia" on storage.objects;
create policy "modelos: admin cambia" on storage.objects
  for update to authenticated
  using (bucket_id = 'modelos' and (select public.es_admin()))
  with check (bucket_id = 'modelos' and (select public.es_admin()));

drop policy if exists "modelos: admin borra" on storage.objects;
create policy "modelos: admin borra" on storage.objects
  for delete to authenticated
  using (bucket_id = 'modelos' and (select public.es_admin()));
