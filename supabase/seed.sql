-- =============================================================================================
-- FOCO · Datos de la demo (F4, T4.1). GENERADO por scripts/generar-seed.mjs — no editar a mano.
-- Fuente: public/models/catalogo.json + public/data/sitio.json
-- Se pega en Supabase → SQL Editor → Run, DESPUÉS de schema.sql. Se puede volver a correr.
-- Ojo: vuelve a dejar los 8 lentes y los textos como en los JSON (pisa lo editado en el panel).
-- =============================================================================================

begin;

-- 1. Lentes (si ya existen, se actualizan)
insert into public.lentes (id, codigo, nombre, tipo, familia, archivo, miniatura_frente, miniatura_34, peso_kb,
  ancho_total_mm, calibre, puente, patilla, precio, visible, orden, recolorear, cristal, credito, nota)
values
  ('optico-acetato-negro', 'L01', 'Acetato negro', 'receta', 'cuadrado-grueso', '/models/ready/optico-acetato-negro.glb', '/models/thumbs/optico-acetato-negro_frente.webp', '/models/thumbs/optico-acetato-negro_34.webp', 454, 142, null, null, null, null, true, 10, null, null, '{"titulo":"Eyeglasses black v5","autor":"Edoardo.Panichi","licencia":"CC-BY-4.0","fuente":"https://sketchfab.com/3d-models/eyeglasses-black-v5-346d4892ad344aecb838767a9e66edec","modificado":true}'::jsonb, 'Se quitaron los logos metálicos y las inscripciones de marca de las patillas (textura); cristal pasado a transparente.'),
  ('optico-rectangular-negro', 'L02', 'Rectangular negro', 'receta', 'rectangular', '/models/ready/optico-rectangular-negro.glb', '/models/thumbs/optico-rectangular-negro_frente.webp', '/models/thumbs/optico-rectangular-negro_34.webp', 988, 140, null, null, null, null, true, 20, null, null, '{"titulo":"Black rectangular eyeglasses","autor":"islem-rd","licencia":"CC-BY-4.0","fuente":"https://sketchfab.com/3d-models/black-rectangular-eyeglasses-dd6b70d2f0c5492791f05469c3d385c4","modificado":true}'::jsonb, 'Sin cristales en el modelo (el probador puede agregar un plano transparente).'),
  ('optico-cateye-carey', 'L03', 'Cat-eye carey', 'receta', 'cat-eye', '/models/ready/optico-cateye-carey.glb', '/models/thumbs/optico-cateye-carey_frente.webp', '/models/thumbs/optico-cateye-carey_34.webp', 579, 140, null, null, null, null, true, 30, null, null, '{"titulo":"Glasses (Rigel)","autor":"Agha.Najam","licencia":"CC-BY-4.0","fuente":"https://sketchfab.com/3d-models/glasses-rigel-47d044c57dc64586a09c0b181c34c874","modificado":true}'::jsonb, 'Originalmente de sol: cristales pasados a transparentes. Se puede volver a sol recoloreando LENS_*. Se taparon las inscripciones de marca (textura) y se quitaron las placas con el nombre modeladas en las patillas.'),
  ('optico-panto-negro', 'L04', 'Panto negro', 'receta', 'redondo-panto', '/models/ready/optico-panto-negro.glb', '/models/thumbs/optico-panto-negro_frente.webp', '/models/thumbs/optico-panto-negro_34.webp', 750, 134, null, null, null, null, true, 40, null, null, '{"titulo":"Eyewear (Specs)","autor":"rojencha","licencia":"CC-BY-4.0","fuente":"https://sketchfab.com/3d-models/eyewear-specs-bb1a41bb9d4d412c985ba1492985e90f","modificado":true}'::jsonb, 'Venía de costado: rotado.'),
  ('optico-redondo-dorado', 'L05', 'Redondo dorado', 'receta', 'redondo-metal', '/models/ready/optico-redondo-dorado.glb', '/models/thumbs/optico-redondo-dorado_frente.webp', '/models/thumbs/optico-redondo-dorado_34.webp', 402, 134, null, null, null, null, true, 50, null, null, '{"titulo":"GLASSES - MOSCOT ZEV-TT SE","autor":"Viky","licencia":"CC-BY-4.0","fuente":"https://sketchfab.com/3d-models/glasses-moscot-zev-tt-se-20e76258ad1542bcae86d2daa6c27c57","modificado":true}'::jsonb, 'Se quitó el logo de marca impreso en el cristal. En la página NO usar el nombre de la marca original.'),
  ('optico-medio-aro-negro', 'L06', 'Medio aro negro', 'receta', 'rectangular-medio-aro', '/models/ready/optico-medio-aro-negro.glb', '/models/thumbs/optico-medio-aro-negro_frente.webp', '/models/thumbs/optico-medio-aro-negro_34.webp', 418, 136, null, null, null, null, true, 60, null, null, '{"titulo":"Glasses 3D model","autor":"nattsol","licencia":"CC-BY-4.0","fuente":"https://sketchfab.com/3d-models/glasses-3d-model-74c1d202ac0249e39823e379e2b065e9","modificado":true}'::jsonb, null),
  ('sol-aviador-dorado', 'S01', 'Aviador dorado', 'sol', 'aviador', '/models/ready/sol-aviador-dorado.glb', '/models/thumbs/sol-aviador-dorado_frente.webp', '/models/thumbs/sol-aviador-dorado_34.webp', 350, 142, null, null, null, null, true, 70, array['FRAME_0', 'FRAME_3']::text[], '{"tinte":"#2F3229"}'::jsonb, '{"titulo":"Aviator sunglasses","autor":"Kimppo","licencia":"CC-BY-4.0","fuente":"https://sketchfab.com/3d-models/aviator-sunglasses-00d1cb5aa82745228a3b764c97f867de","modificado":true}'::jsonb, null),
  ('sol-redondo-steampunk', 'S02', 'Redondo steampunk', 'sol', 'redondo', '/models/ready/sol-redondo-steampunk.glb', '/models/thumbs/sol-redondo-steampunk_frente.webp', '/models/thumbs/sol-redondo-steampunk_34.webp', 469, 138, null, null, null, null, true, 80, array['FRAME_0', 'FRAME_1', 'FRAME_2', 'FRAME_3', 'FRAME_4']::text[], '{"tinte":"#1C1C1E"}'::jsonb, '{"titulo":"Sunglasses (game ready)","autor":"JakOuNien","licencia":"CC-BY-4.0","fuente":"https://sketchfab.com/3d-models/sunglasses-game-ready-fda93c17ad044e2e8d97684b09f420ea","modificado":true}'::jsonb, 'Texturas reducidas de 80 MB a <0,5 MB.')
on conflict (id) do update set
  codigo = excluded.codigo, nombre = excluded.nombre, tipo = excluded.tipo, familia = excluded.familia,
  archivo = excluded.archivo, miniatura_frente = excluded.miniatura_frente, miniatura_34 = excluded.miniatura_34,
  peso_kb = excluded.peso_kb, ancho_total_mm = excluded.ancho_total_mm, calibre = excluded.calibre,
  puente = excluded.puente, patilla = excluded.patilla, precio = excluded.precio, visible = excluded.visible,
  orden = excluded.orden, recolorear = excluded.recolorear, cristal = excluded.cristal,
  credito = excluded.credito, nota = excluded.nota;

-- 2. Colores: se borran los de estos lentes y se cargan de nuevo
delete from public.variantes where lente_id in ('optico-acetato-negro', 'optico-rectangular-negro', 'optico-cateye-carey', 'optico-panto-negro', 'optico-redondo-dorado', 'optico-medio-aro-negro', 'sol-aviador-dorado', 'sol-redondo-steampunk');

insert into public.variantes (lente_id, orden, nombre, muestra, original, claro, frame)
values
  ('optico-acetato-negro', 10, 'Negro brillo', '#1E1E1E', false, false, '{"color":"#0E0E0E","roughness":0.25,"metalness":0}'::jsonb),
  ('optico-acetato-negro', 20, 'Carey', '#7A3E12', false, false, '{"procedural":"carey","roughness":0.3,"metalness":0}'::jsonb),
  ('optico-acetato-negro', 30, 'Cristal', '#E8E4DC', false, true, '{"color":"#DCD9D2","opacity":0.4,"roughness":0.12,"metalness":0}'::jsonb),
  ('optico-rectangular-negro', 10, 'Negro', '#1E1E1E', true, false, null),
  ('optico-rectangular-negro', 20, 'Carey', '#7A3E12', false, false, '{"procedural":"carey","roughness":0.3,"metalness":0}'::jsonb),
  ('optico-cateye-carey', 10, 'Negro brillo', '#1E1E1E', false, false, '{"color":"#0E0E0E","roughness":0.25,"metalness":0}'::jsonb),
  ('optico-cateye-carey', 20, 'Carey', '#7A3E12', true, false, null),
  ('optico-cateye-carey', 30, 'Cristal', '#E8E4DC', false, true, '{"color":"#DCD9D2","opacity":0.4,"roughness":0.12,"metalness":0}'::jsonb),
  ('optico-panto-negro', 10, 'Negro brillo', '#1E1E1E', false, false, '{"color":"#0E0E0E","roughness":0.25,"metalness":0}'::jsonb),
  ('optico-panto-negro', 20, 'Carey', '#7A3E12', false, false, '{"procedural":"carey","roughness":0.3,"metalness":0}'::jsonb),
  ('optico-panto-negro', 30, 'Cristal', '#E8E4DC', false, true, '{"color":"#DCD9D2","opacity":0.4,"roughness":0.12,"metalness":0}'::jsonb),
  ('optico-redondo-dorado', 10, 'Dorado', '#C9A55A', true, false, null),
  ('optico-redondo-dorado', 20, 'Plateado', '#CFCFCF', false, true, '{"color":"#D6D6D6","metalness":1,"roughness":0.18}'::jsonb),
  ('optico-redondo-dorado', 30, 'Negro', '#1E1E1E', false, false, '{"color":"#1A1A1A","metalness":0.6,"roughness":0.35}'::jsonb),
  ('optico-medio-aro-negro', 10, 'Dorado', '#C9A55A', false, false, '{"color":"#D9B56C","metalness":1,"roughness":0.22}'::jsonb),
  ('optico-medio-aro-negro', 20, 'Plateado', '#CFCFCF', false, true, '{"color":"#D6D6D6","metalness":1,"roughness":0.18}'::jsonb),
  ('optico-medio-aro-negro', 30, 'Negro', '#1E1E1E', true, false, null),
  ('sol-aviador-dorado', 10, 'Dorado', '#C9A55A', true, false, null),
  ('sol-aviador-dorado', 20, 'Plateado', '#CFCFCF', false, true, '{"color":"#D6D6D6","metalness":1,"roughness":0.18}'::jsonb),
  ('sol-aviador-dorado', 30, 'Negro', '#1E1E1E', false, false, '{"color":"#1A1A1A","metalness":0.6,"roughness":0.35}'::jsonb),
  ('sol-redondo-steampunk', 10, 'Dorado', '#C9A55A', false, false, '{"color":"#D9B56C","metalness":1,"roughness":0.22}'::jsonb),
  ('sol-redondo-steampunk', 20, 'Plateado', '#CFCFCF', false, true, '{"color":"#D6D6D6","metalness":1,"roughness":0.18}'::jsonb),
  ('sol-redondo-steampunk', 30, 'Negro', '#1E1E1E', true, false, null);

-- 3. Textos del sitio (una fila por bloque)
insert into public.sitio (clave, valor)
values
  ('marca', '{"nombre":"FOCO","slogan":"Ver claro","rubro":"Óptica","ciudad":"Comodoro Rivadavia","provincia":"Chubut","whatsapp":"5493517734652","instagram":"","url":"https://optica-vto.vercel.app"}'::jsonb),
  ('seo', '{"titulo":"FOCO · Óptica en Comodoro Rivadavia · Probate los lentes en tu cara","descripcion":"Óptica en Comodoro Rivadavia. Probate los lentes en tu cara desde el celular, en 3D. Control de la vista, lentes de contacto, laboratorio y obras sociales."}'::jsonb),
  ('hero', '{"lente":"L01","texto":"Probate los lentes en tu cara desde el celular, en 3D. Sin descargar nada."}'::jsonb),
  ('direccion', '"[DIRECCIÓN], Comodoro Rivadavia"'::jsonb),
  ('maps_url', '"https://www.google.com/maps/search/?api=1&query=Comodoro+Rivadavia+Chubut"'::jsonb),
  ('horarios', '[{"dias":"Lun a vie","horas":"[HORARIO]"},{"dias":"Sáb","horas":"[HORARIO]"}]'::jsonb),
  ('formas', '{"Cuadrados":["cuadrado-grueso","rectangular","rectangular-medio-aro"],"Redondos":["redondo-panto","redondo-metal","redondo"],"Cat-eye":["cat-eye"],"Aviador":["aviador"]}'::jsonb),
  ('motivos_turno', '["Control de la vista","Lentes de contacto","Lentes con receta","Lentes de sol","Taller de reparación"]'::jsonb),
  ('servicios', '[{"nombre":"Control de la vista","accion":"Turno","motivo":"Control de la vista"},{"nombre":"Lentes de contacto","accion":"Turno","motivo":"Lentes de contacto"},{"nombre":"Laboratorio y armado","accion":"Consultar","motivo":"Lentes con receta"},{"nombre":"Taller de reparación","accion":"Consultar","motivo":"Taller de reparación"}]'::jsonb),
  ('obras_sociales', '["SEROS","OSDE","Swiss Medical","PAMI","Galeno","Consultar otras"]'::jsonb),
  ('faq', '[{"p":"¿Cuánto tarda el armado con receta?","r":"[TIEMPO QUE DEFINA LA ÓPTICA]. Te avisamos por WhatsApp cuando están listos."},{"p":"¿El probador mide mi graduación?","r":"No. El probador te muestra cómo te queda el armazón. La graduación la mide un profesional en el control de la vista."},{"p":"¿Trabajan con mi obra social?","r":"Trabajamos con las obras sociales de la lista. Si la tuya no está, escribinos y te decimos qué cubre."},{"p":"¿Qué necesito para hacerme lentes con receta?","r":"La receta de tu oftalmólogo (vigente) o un control de la vista con nosotros. Si tenés obra social, traé tu credencial."},{"p":"¿Tienen garantía?","r":"Sí: [GARANTÍA QUE DEFINA LA ÓPTICA] en armazones y cristales por fallas de fabricación."},{"p":"¿Hacen envíos?","r":"[ENVÍOS QUE DEFINA LA ÓPTICA]. Los lentes con receta se retiran en el local para ajustarlos a tu cara."},{"p":"¿Mis fotos del probador se guardan?","r":"No. La cámara no se graba ni se sube: todo pasa en tu celular. La foto solo se guarda si vos la compartís o la descargás."}]'::jsonb),
  ('mensajes', '{"consulta":"Hola FOCO! Me probé el {nombre} ({codigo}) en color {color} en la web y me interesa. ¿Tienen stock y precio con mi obra social? {link}","turno":"Hola FOCO! Quiero sacar turno para: {motivo}. Mi nombre es: ","general":"Hola FOCO! Tengo una consulta: "}'::jsonb),
  ('hecho_por', '{"texto":"Sitio hecho por La PYME","url":""}'::jsonb)
on conflict (clave) do update set valor = excluded.valor;

commit;

-- Control: tiene que dar 8 lentes, 23 colores y 13 bloques de texto.
select
  (select count(*) from public.lentes    where id in ('optico-acetato-negro', 'optico-rectangular-negro', 'optico-cateye-carey', 'optico-panto-negro', 'optico-redondo-dorado', 'optico-medio-aro-negro', 'sol-aviador-dorado', 'sol-redondo-steampunk')) as lentes,
  (select count(*) from public.variantes where lente_id in ('optico-acetato-negro', 'optico-rectangular-negro', 'optico-cateye-carey', 'optico-panto-negro', 'optico-redondo-dorado', 'optico-medio-aro-negro', 'sol-aviador-dorado', 'sol-redondo-steampunk')) as colores,
  (select count(*) from public.sitio) as textos;
