# Tareas por fase

Orden pensado de **lo más riesgoso a lo más fácil**. Una fase = una rama. No pasar a la siguiente sin cumplir el "listo" de la actual.

**Fase actual: F4** (de F1 falta probar en celu T1.7–T1.9 y el Android). **Después: F3b**, con la rama `fase/F3b-nivel-2` saliendo de F4 terminada, para armar el nivel 2 sobre los datos de Supabase.

---

## F0 — Prueba de concepto del probador (rama `fase/F0-poc-vto`)
Objetivo: saber si el probador anda fluido en un celu real. Página pelada, sin diseño.
- [x] T0.1 Proyecto Vite vanilla + `@vitejs/plugin-basic-ssl` + `npm run dev` con `--host`. Estructura `src/vto/`.
- [x] T0.2 Instalar `three` y `@mediapipe/tasks-vision`; copiar wasm a `public/mediapipe/wasm/`; descargar `face_landmarker.task` a `public/mediapipe/`.
- [x] T0.3 Página `vto-test.html`: botón "Abrir cámara" → video frontal espejado a pantalla completa.
- [x] T0.4 FaceLandmarker en modo VIDEO (GPU con fallback CPU) dibujando los 478 puntos en un canvas 2D.
- [x] T0.5 Escena Three.js con cámara 63° + grupo cabeza con la matriz de MediaPipe + oclusor + lente `L01` (spec 02 §3–4).
- [x] T0.6 Modo `?debug=1`: FPS en pantalla, mostrar/ocultar oclusor, sliders del offset `AJUSTE_PUENTE`.
- [x] T0.7 Suavizado One Euro (spec 02 §6).
- [ ] T0.8 Deploy en Vercel y prueba en Chrome Android + Safari iPhone.
**Listo F0:** R-02, R-03, R-05 y ≥ 30 FPS en un celular de gama media con la URL de Vercel. Anotar acá los FPS medidos por equipo.

> T0.1–T0.7 probados en PC (Chrome con cámara simulada, 2026-11-03). **Falta lo de celular real (T0.8)**: R-02 con giro ±45° y R-03 de perfil solo se pueden comprobar con una cara de verdad moviéndose.

| Equipo | Navegador | FPS (`?debug=1`) | Motor | R-02 | R-03 | R-05 | Notas |
|---|---|---|---|---|---|---|---|
| PC (cámara simulada) | Chrome 3D por software | 26–31 | GPU | — | — | sí (0,15 → 0,03 mm/cuadro) | referencia, no cuenta para el "listo" |
| _Android gama media_ | Chrome | | | | | | |
| _iPhone_ | Safari | | | | | | |

## F1 — Probador completo (rama `fase/F1-probador`)
- [x] T1.0 Patillas tapadas a los costados: oclusor con ancho 1.0 (achicarlo deja ver la cara interna de las patillas a través del cristal) + patillas giradas 7° hacia afuera desde la bisagra en los 8 lentes, con separación extra opcional en X. Sliders en `?debug=1`: "ancho oclusor" (0.95–1.05), "oclusor Z", "apertura patillas" (0–15°), "separación patillas (mm)"; todos en "copiar valores". Fijos: `AJUSTE_PUENTE = {x:0, y:-0.8, z:0.6}`, `SUAVIZADO = {minCutoff:1, beta:0.37}`. **Listo:** de frente no se ve nada de las patillas a través del cristal, y de perfil la patilla cercana se ve entera hasta la oreja (iPhone + PC).
- [x] T1.1 Módulo `abrirProbador()` con import dinámico y la API de spec 02.
- [x] T1.2 Carrusel de los 8 lentes con precarga anterior/siguiente (R-06).
- [x] T1.3 Materiales de cristal baratos para móvil; tintes de sol (S01, S02).
- [x] T1.4 Variantes de color por `FRAME_*` (R-07).
- [x] T1.5 Foto con branding y Web Share (R-08).
- [x] T1.6 Plan B selfie (R-09).
- [ ] T1.7 Degradación por FPS (spec 02 §8).
- [ ] T1.8 Intro "ficha técnica" con puntos y cotas (R-13).
- [ ] T1.9 Loader temático + Service Worker para caché.
- [ ] T1.10 (opcional) DIP aproximada por iris.
**Listo F1:** R-01 a R-13 probados en los dos celulares.

## F2 — Pipeline de modelos (rama `fase/F2-modelos`)
- [x] T2.1 Normalizar los 8 modelos de la demo (hecho fuera del repo, ver spec 03).
- [x] T2.2 Miniaturas frente/3/4 en WebP (hechas).
- [x] T2.3 `scripts/miniaturas.mjs` (Playwright + Three) para generar miniaturas de lentes nuevos. Usa los cristales y el color inicial del probador; se regeneraron las 16.
- [x] T2.4 Limpiar la marca tenue en la textura de patillas de L01 y L03. Con `scripts/tapar-textura.mjs`; en L03 además se quitaron las placas con el nombre modeladas (`--quitar-piezas`). Queda en L01 un contorno muy tenue modelado en la patilla (ver nota de F2).
- [x] T2.5 Cristal para L02 (plano transparente con forma del aro). Lo agrega el probador al cargar (T1.3, `src/vto/cristales.js`).
- [x] T2.6 Texturas de variantes (carey, cristal, negro mate) CC0 o procedurales. Carey procedural y cristal/negro por material (T1.4, `src/vto/variantes.js`).
**Listo F2:** agregar un lente nuevo lleva < 10 min siguiendo spec 03.

## F3 — Sitio de la óptica FOCO (rama `fase/F3-sitio`)
- [ ] T3.1 Tokens de diseño (paleta, tipos, grano) según spec 05.
- [ ] T3.2 Header + hero "VER CLARO" (imagen primero, 3D después).
- [ ] T3.3 Tira técnica. **No va:** la spec 04 la sacó para alivianar ("sin tira técnica").
- [ ] T3.4 Catálogo con fichas técnicas + filtros (R-20, R-21).
- [ ] T3.5 Ficha de lente `#lente/Lxx` + WhatsApp (R-22).
- [ ] T3.6 Servicios + turnos por WhatsApp (R-23, R-24).
- [ ] T3.7 Bloque lupa "ver claro".
- [ ] T3.8 Obras sociales, FAQ, ubicación, footer con créditos (R-25 a R-28).
- [ ] T3.9 SEO local + Open Graph (R-29).
- [ ] T3.10 Auditoría Lighthouse móvil: R-40, R-42.
**Listo F3:** checklist de entrega (abajo) completo.

## F3b — Nivel 2 visual (rama `fase/F3b-nivel-2`) — ver specs/07-nivel-2.md
Una tarea por vez, probar en celu Y en PC después de cada una.
- [ ] T3b.1 Tipografía editorial (Instrument Serif itálica de acento) + cuadrícula, marcas de corte y numeración de secciones.
- [ ] T3b.2 Luz de estudio: fondos con viñeta, sombra de contacto y reflejo; regenerar miniaturas con luz de estudio.
- [ ] T3b.3 Sprites 360° (24 cuadros por lente) + componente de giro (hover en PC, arrastrar en celu).
- [ ] T3b.4 Catálogo pasarela: horizontal sticky en PC, un lente por pantalla en celu.
- [ ] T3b.5 Hero nivel 2: título gigante, lente con luz de estudio, rótulos; giroscopio en celu.
- [ ] T3b.6 3D en PC: hero (gira con el mouse) y ficha (girar/zoom), carga diferida solo en PC.
- [ ] T3b.7 Ficha nivel 2: dibujo técnico SVG con cotas + QR "abrilo en tu celu" en PC.
- [ ] T3b.8 Probador explicado estilo lanzamiento (sticky en PC, pasos en celu).
- [ ] T3b.9 Momento de color a pantalla completa.
- [ ] T3b.10 Lookbook: fotos Unsplash/Pexels sin lentes + nuestros lentes puestos con el modo selfie; créditos.
- [ ] T3b.11 Micro-interacciones: entrada con foco, View Transitions, botones magnéticos, cursor propio, cotas animadas, scroll suave.
- [ ] T3b.12 Auditoría: Lighthouse celu (≥ 95 rendimiento), PC, prefers-reduced-motion, FPS.
**Listo F3b:** se ve como una marca de moda en celu y en PC, y el celu sigue cargando en < 2,5 s.

## F4 — Panel admin (rama `fase/F4-admin`)
- [ ] T4.1 Supabase (plan gratis): tablas `lentes`, `variantes`, `sitio`; storage para GLB y miniaturas.
- [ ] T4.2 Panel estilo iPhone: login, ABM de lentes (subir GLB ya normalizado + miniaturas), precios, textos.
- [ ] T4.3 La página lee de Supabase con fallback al JSON.
**Listo F4:** la óptica cambia un precio y un texto sin tocar código.

## F5 — Demo de venta
- [ ] T5.1 Contenido verosímil de FOCO (dirección de Comodoro inventada, obras sociales reales de la zona, FAQ).
- [ ] T5.2 Video corto del probador para mostrar por WhatsApp/Instagram.
- [ ] T5.3 Versión "con tu marca": cambiar FOCO por la óptica del cliente en < 1 h.

---

## Checklist de entrega
- [ ] Tiene personalidad (ficha técnica de moda) y no parece plantilla.
- [ ] Anda bien en celular (Chrome Android + Safari iPhone).
- [ ] Carga rápido (R-40) y el probador abre en < 3 s.
- [ ] Mensajes de WhatsApp completos y claros.
- [ ] Créditos 3D visibles; sin marcas reales ni modelos de videojuegos.
- [ ] Textos de privacidad y "DIP orientativa".
- [ ] Deployado y probado con la URL real.
