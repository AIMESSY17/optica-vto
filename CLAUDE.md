# CLAUDE.md — Óptica VTO (demo para vender a ópticas)

Proyecto de **La PYME**. Página demo de óptica con **probador virtual de lentes en la cara (VTO)**, gratis y 100 % en el navegador.
La demo se llama **FOCO** (óptica ficticia). Se usa para venderle la página a ópticas reales: después se cambia marca, catálogo y textos.

## Cómo trabajamos (SDD: Spec-Driven Development)
1. **Antes de tocar código, leé** `specs/00-vision.md` y la spec de la fase en curso. `specs/tasks.md` dice qué fase toca.
2. **Una fase por vez.** Rama `fase/F0-...`, `fase/F1-...`. Al terminar: tests/chequeos de la fase → merge a `main`.
3. **Marcá las tareas** en `specs/tasks.md` (`[x]`) cuando cumplan su criterio de "listo". No marques algo que no probaste.
4. **No cambies las specs por tu cuenta.** Si algo de la spec no se puede o hay una forma mejor, frená y preguntá.
5. Al terminar cada tarea, explicá en criollo qué hiciste y cómo probarlo (el dueño no es experto: entiende la lógica, no la jerga).

## Reglas fijas
- **Mobile primero.** Se prueba siempre en celular real (Chrome Android + Safari iPhone).
- **Fluidez antes que detalle.** Si un efecto baja los FPS o atrasa la carga, se recorta.
- **Diseño liviano y aireado** (aprobado): fondo casi blanco, negro, grises, rojo SOLO en cotas/códigos. Nada pesado ni cargado, nada de bordó ni bloques negros. Ver `specs/05-diseno.md` y `docs/boceto/`.
- **Three.js y MediaPipe se cargan SOLO al abrir el probador** (import dinámico). La página inicial no los descarga.
- **Privacidad:** la cámara nunca sube nada. Todo se procesa en el celular. Decirlo en la UI.
- **Licencias:** modelos solo CC0/CC-BY con crédito en `CREDITOS.md` y en el pie. Nada de modelos de videojuegos ni logos/nombres de marcas reales.
- Todo gratis: Vite + JS vanilla, deploy en Vercel (repo GitHub AIMESSY17).

## Stack
- Vite (vanilla JS, módulos ES). `three` + `@mediapipe/tasks-vision`. Sin framework.
- Dev en celular: `vite --host` + `@vitejs/plugin-basic-ssl` (la cámara exige HTTPS).
- Datos: `public/models/catalogo.json` (F0–F3). Panel admin con Supabase recién en F4.

## Modelos 3D (ya preparados — no rehacer)
- `public/models/ready/*.glb`: 8 lentes normalizados. **Metros, Y arriba, frente a +Z, patillas a -Z, origen = puente de la nariz.**
- Materiales `LENS_*` = cristales, `FRAME_*` = marco (recolorear por nombre).
- Comprimidos con meshopt → `GLTFLoader().setMeshoptDecoder(MeshoptDecoder)` (`three/examples/jsm/libs/meshopt_decoder.module.js`).
- `public/models/occluder/canonical_face_model.obj`: cara base de MediaPipe (cm) = oclusor invisible.
- `public/models/thumbs/*.webp`: miniaturas transparentes (frente y 3/4) para el catálogo. El catálogo NO carga GLB.
- Lente nuevo → `node scripts/normalizar.mjs` (ver `specs/03-pipeline-3d.md`).

## Comandos
```bash
npm run dev       # vite --host (https)
npm run build
npm run preview
node scripts/normalizar.mjs entrada.glb public/models/ready/x.glb --ancho 140 --cristal "lens"
node scripts/normalizar.mjs entrada.glb x --listar        # piezas numeradas (para --quitar-piezas 1,3: logos modelados)
node scripts/tapar-textura.mjs entrada.glb salida.glb --material FRAME_0 --zona base:x,y,w,h:dx,dy   # tapar logos en texturas
npm run miniaturas -- L07                                 # miniaturas frente y 3/4 (todas si no se pasa código)
```
