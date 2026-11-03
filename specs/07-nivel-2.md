# 07 — Nivel 2 visual (F3b)

La versión liviana quedó prolija pero básica. Nivel 2 = **dirección de arte**: composición de revista, tipografía con carácter, detalles de imprenta, fotos de estudio, interacciones premium. Sigue siendo clara y liviana (paleta de `05-diseno.md`), pero trabajada. **Diseño pensado para celular Y para PC por separado** (no es el celular estirado).

## Concepto
**"El mundo se ve borroso hasta que te ponés FOCO."** Todo juega con *enfocar*: entrar a la página, el probador, la lupa, la ficha.

## Reglas de rendimiento (no se negocian)
- Celular: **sin Three.js en la home**. LCP < 2,5 s, JS inicial ≤ 60 KB gzip.
- PC: Three.js permitido en home y ficha **solo si** `matchMedia('(min-width: 1024px) and (pointer: fine)')`, cargado con import dinámico **después del primer render** (`requestIdleCallback`). Antes se ve la imagen/sprite; el 3D reemplaza sin salto.
- Animar solo `transform`/`opacity`/`filter` puntual. `prefers-reduced-motion` → todo estático.
- Si los FPS bajan, se apagan efectos (mismo criterio que el probador).

## 1. Tipografía editorial
- Títulos: `Archivo` 800–900, `font-stretch` 115–125 %, tracking negativo.
- **Acento serif itálica**: `Instrument Serif` italic (Google Fonts) en la palabra clave de cada título: "Ver *claro*.", "Tu cara es *el probador*.", "Hecho para *tu cara*."
- PC: títulos enormes (clamp hasta ~220 px) que cruzan la pantalla y quedan detrás de los lentes.
- Mono (`IBM Plex Mono`) para códigos, medidas, numeración y rótulos.

## 2. Detalles de imprenta (riqueza sin ensuciar)
- Cuadrícula milimetrada muy tenue de fondo (líneas `--linea` a 4–6 % de opacidad, paso 8 px), solo en secciones técnicas (hero, ficha, probador explicado).
- Marcas de corte en las esquinas de las secciones clave.
- Numeración de sección en mono: `01 — CATÁLOGO`, `02 — PROBADOR`, `03 — LOOKBOOK`…
- Cotas rojas finas con flechas y medida real (ver §9 animación).
- Todo en línea de 1 px. Nada de bloques pesados.

## 3. Hero
- Título "Ver *claro*." gigante + lente L01 enorme con luz de estudio (§5) y cota roja con la medida.
- **PC**: el lente es **3D** y gira suave siguiendo el mouse (máx ±20°), con reflejos del environment. Fallback: imagen.
- **Celular**: imagen con leve movimiento por giroscopio (`DeviceOrientation`; en iOS pedir permiso solo tras un toque; sin permiso → movimiento por scroll).
- Rótulos técnicos chicos alrededor (`FIG. 01 · L01 · 142 MM · FW26`).

## 4. Catálogo = pasarela
- **PC**: pasarela horizontal de lentes grandes (scroll vertical mueve horizontal en una sección sticky). Cada lente: número gigante en contorno detrás (`01`), cota, nombre, colores. **Hover → gira 360°** (sprite) y se despliegan medidas. Filtros arriba como chips.
- **Celular**: un lente por pantalla, carrusel con `scroll-snap` horizontal; **arrastrar el lente lo gira** (sprite).
- **Sprite 360°**: 24 cuadros WebP por lente (cada 15°), generado con `npm run miniaturas -- --giro` (extender el script). Objetivo ≤ 250 KB por lente; se carga al acercarse a la pantalla (IntersectionObserver).

## 5. Fotografía de estudio
- Fondo de cada lente: degradé radial suave con viñeta (gris estudio claro → un poco más oscuro en bordes), no caja plana.
- Sombra de contacto (elipse difusa debajo) y reflejo tenue del aro (imagen espejada, opacidad 8–12 %, fade).
- Regenerar miniaturas/sprites con luz más de estudio (key + fill + rim suave).

## 6. Probador explicado estilo lanzamiento
- **PC**: sección sticky: un mockup de celular fijo al centro; al scrollear cambian los pasos adentro: (1) detecta la cara — aparecen puntos, (2) aparece el lente, (3) cambia de color, (4) foto con marca. Alrededor, etiquetas con líneas finas señalando: "478 puntos", "oclusión real", "30 FPS", "nada se sube".
- **Celular**: los mismos 4 pasos apilados, se activan al entrar en pantalla.
- Imágenes de los pasos: capturas reales del probador (generarlas con la cámara simulada).

## 7. Lookbook
- Sección editorial tipo revista: grilla asimétrica (PC 3 columnas con alturas distintas; celular 2 columnas), fotos con ficha al pie: `L03 · Carey · Sofía`.
- **Fotos**: retratos de **Unsplash/Pexels (licencia comercial gratis)** de personas **sin lentes**, frontales, buena luz, fondo neutro, variedad de caras. **No** usar fotos con lentes de otras marcas, ni de famosos.
- Se les ponen **nuestros lentes con el modo selfie del probador** (foto sin el marco FOCO) → se guardan en `public/lookbook/`. Nombres de pila inventados.
- Guardar en `public/lookbook/CREDITOS.md` el link y autor de cada foto original.
- Cuando haya cliente real: reemplazar por fotos de clientes de la óptica (con su permiso).
- Al tocar una foto → abre la ficha de ese lente en ese color.

## 8. Ficha de lente
- **PC**: 2 columnas. Izquierda: lente **3D girable con el mouse** (OrbitControls limitado, zoom suave, luz de estudio) sobre fondo de estudio. Derecha: **dibujo técnico** SVG del contorno frontal con cotas (calibre, puente, ancho total), colores, precio, botones.
- **"Probátelos" en PC**: si no hay cámara (o siempre, como opción) → **QR** para abrir ese lente en el celular (`?lente=L03&color=carey`). QR generado en el front (librería chica, ej. `qrcode-generator`).
- **Celular**: hoja desde abajo como ahora, con sprite 360° arriba y el dibujo técnico chico.
- El dibujo técnico se genera una vez por lente desde el contorno de la miniatura de frente (script) → `public/models/planos/Lxx.svg`.

## 9. Micro-interacciones
- **Entrada con foco**: al cargar, el contenido aparece con `filter: blur(8px)` → 0 en 500 ms (una sola vez, solo el hero).
- **View Transitions** tarjeta → ficha (la foto del lente "vuela"). Fallback: corte normal.
- **PC**: botones magnéticos (se acercan al cursor unos px), cursor propio: aro chico que se agranda a "lente" sobre lentes y botones.
- **Cotas** que se dibujan (stroke-dashoffset) y número que cuenta hasta la medida al entrar en pantalla.
- **Scroll suave en PC** (Lenis o CSS; < 5 KB).

## 10. Momento de color
- Una sección a pantalla completa del **color del lente destacado** (ámbar carey `#7A3E12`→`#C98A3B` o rojo translúcido), con el lente encima, título gigante en blanco con serif itálica y un CTA.
- Es el único bloque de color fuerte de la página.

## Orden de secciones (nivel 2)
Hero → Catálogo (pasarela) → Momento de color → Probador explicado → Lookbook → Servicios + Lupa + Turno → Obras sociales → Preguntas → Ubicación → Footer (FOCO gigante cortado, créditos 3D y de fotos).

## Descartado
- Texto del hero que se ve borroso afuera del lente y nítido adentro (idea 1).
