# 08 — Home "FOCO Edición 01" (pedido del dueño, 3/11/2026)

Rediseño completo de la home como **revista de moda de lentes**: fotos de estudio, tipografía gigante que juega con el objeto, detalles técnicos finos (lámina tipo Balenciaga) y grano analógico. Referencias: `docs/referencias/`.
**Manda sobre `05-diseno.md` y `07-nivel-2.md` en la home** (fondo blanco, "nada de bloques negros", columna angosta: eso se va). La ficha, las hojas y el probador siguen como estaban.

## Reglas
- **Layout.** PC (≥ 1024 px): 12 columnas, máx. 1440 px, márgenes 64–80 px, gutter 24 px; cada capítulo es una composición de PC. Celu: una columna con la misma intensidad (títulos gigantes, objetos que se salen del borde).
- **Capítulos claro / oscuro.** Estudio: radial `#E9E8E4` → `#CFCDC7`, texto `#111111`. Noche: radial `#151311` → `#0A0908`, texto `#F2EFE9`, secundarios `#A39F97`. Entre capítulos el fondo pasa suave (puentes con degradé), sin corte seco. Nada de blanco plano.
- **Grano** en todos los fondos: `public/img/grano.png` (256×256, `node scripts/grano.mjs`), `mix-blend-mode: overlay`, opacidad .05 claro / .09 oscuro. Estático.
- **Rojo:** líneas, cotas y puntos `#E0301E`; texto chico `#FF5A45` sobre oscuro. Sobre claro el texto chico va `#A8200F` (con `#C8291A` no llega a AA en el borde del degradé: 3,5 a 1).
- **Tipografía:** títulos Archivo 900, `font-stretch: 125%`, mayúsculas, tracking −0.05em, interlineado 0.8 (celu hasta 140 px, PC hasta 18vw). Acento Instrument Serif itálica en la misma línea ("VER *claro*"). Técnica: IBM Plex Mono 10–12 px.
- **Firma:** banda de texto que se desplaza, título detrás del objeto, corchetes y cotas rojas (LX01, DX E01, F00), garabatos a mano (máx. 2 por pantalla), destello ✦, sello circular que gira (20 s), firma de capítulo `EDICIÓN 01 · FW26 · 03/10`, ventanas de zoom, sombra de contacto debajo de cada lente.
- **Movimiento:** CSS atado al scroll (`animation-timeline: view()`), sin soporte queda quieto. PC: cursor propio y botones magnéticos. `prefers-reduced-motion`: todo quieto.
- **Rendimiento (no cambia):** sin Three.js en la home (ni celu ni PC), JS inicial ≤ 60 KB, LCP < 2,5 s.
- **Modelos 3D vs. fotos (pedido del dueño, 3/11/2026):** los modelos 3D (y sus renders) solo se usan en el probador, las tarjetas del catálogo y la ficha. **Nunca como imagen grande ni macro.** Las imágenes editoriales (portada, momento de color, lookbook) son **fotos**.

## Orden de la home (10 capítulos)
☀ Portada (foto a pantalla completa + “FOCO” gigante encima) · ☀ Ventajas · ☀ Catálogo (lámina de análisis + tira de contornos) · ☾ Tu cara es el probador · ☀ Hecho a mano (zoom L03) · Momento de color (`#B3121B`: foto vertical + “CON *carácter*”) · ☾ Lookbook (9 fotos) · ☀ Control de la vista · ☀ Categorías + obras sociales · ☾ Dónde estamos + preguntas + footer.

## Recursos generados
- `npm run miniaturas -- --grande` → `*_frente_1600.webp` y `*_34_1600.webp` (zoom, categorías).
- `node scripts/contornos.mjs` → `public/models/contornos/` (tira del catálogo).
- `node scripts/mascara-cristales.mjs L01` → `public/models/mascaras/` (tabla nítida solo a través de los cristales).
- Lente nuevo: correr los tres. Si faltan, la página usa la miniatura chica y no muestra su contorno.

## Fotos editoriales
- Van en `public/fotos/editorial/`: `portada-pc.jpg` (horizontal), `portada-celu.jpg` (vertical), `color.jpg` (vertical), `lookbook-01.jpg` … `lookbook-09.jpg`.
- `npm run fotos` → AVIF + WebP en varios anchos en `editorial/gen/` y `gen/fotos.json`. Al compilar, `vite.config.js` arma cada `<picture>` con `srcset`; todas con `loading="lazy"` salvo la portada (es el LCP, `fetchpriority="high"`).
- Portada: pantalla horizontal → `portada-pc`, vertical → `portada-celu` (si hay una sola, va para las dos). “FOCO”, los textos sueltos y los botones van negros o blancos según lo clara que sea la franja del medio de la foto (lo calcula el script).
- Momento de color: PC, foto a la izquierda (5 columnas) y título a la derecha; celu, foto arriba y título abajo.
- Mientras falte una foto se ve un rectángulo de estudio con grano y `[FOTO PORTADA]`, `[FOTO COLOR]`, `[FOTO LOOKBOOK 01]`…, nunca un 3D.
- Créditos: `public/fotos/CREDITOS.md` (archivo, autor, link). El pie muestra los autores de las fotos que están puestas.
