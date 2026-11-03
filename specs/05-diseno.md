# 05 — Diseño (versión liviana, aprobada)

## Concepto: "VER CLARO"
Editorial de moda **liviana y aireada**, casi blanca. La tecnología del probador (puntos, cotas, medidas) aparece **como detalle fino en rojo**, nunca como carga visual.
Sensación buscada: limpia, tranquila, tipo app de iPhone + revista minimalista. **Nada pesado ni cargado.**

Boceto aprobado: artifact "Boceto FOCO óptica" (Home, Probador, Ficha). Es la referencia visual principal.
Referencias de ambiente en `docs/referencias/` (lentes gigantes, tabla vista a través del lente, ficha técnica): se toman **las ideas, no la densidad**.

## Paleta
| Token | Hex | Uso |
|---|---|---|
| `--fondo` | `#FAFAF8` | fondo general |
| `--tinta` | `#111111` | texto, botón principal, íconos |
| `--texto-2` | `#3C3C3A` | párrafos |
| `--gris` | `#6B6B68` | textos secundarios, subtítulos |
| `--gris-claro` | `#9A9A96` | microtextos técnicos |
| `--superficie` | `#F1F0EC` | fondo de miniaturas, chips, botones secundarios |
| `--linea` | `#E4E3DF` | separadores |
| `--borde` | `#DAD9D4` | borde de botones secundarios |
| `--rojo-cota` | `#E0301E` | **solo** cotas, puntos de la cara y códigos (L01). Nunca fondos ni botones |

**Prohibido:** bordó/marrón como acento, bloques negros grandes, fondos oscuros en secciones, grano, bordes duros por todos lados.

## Tipografía (Google Fonts)
- **Títulos:** `Archivo` peso 800, `font-stretch: 115–120%`, tracking `-0.04em`. Hero 76 px, secciones 32 px. Mayúscula inicial, no todo en mayúsculas.
- **Texto y botones:** `Archivo` 400–600, 15–17 px.
- **Técnica:** `IBM Plex Mono` 9–11 px, solo para códigos (L03), medidas (140 MM) y rótulos chicos (PROBADOR VIRTUAL). Usar poco.

## Componentes
- **Botón principal:** fondo `--tinta`, texto `--fondo`, 52 px de alto, `border-radius: 26px` (píldora), texto normal (no mayúsculas).
- **Botón secundario:** borde 1 px `--borde`, fondo transparente, píldora. O solo texto con flecha ("Ver catálogo →").
- **Chips de filtro:** píldoras 36 px; activo `--tinta`/blanco, resto `--superficie`.
- **Tarjeta de lente:** sin borde. Caja `--superficie` con radio 4 px y la miniatura centrada; código rojo chico arriba-izq. Abajo nombre (600, 15 px) y subtítulo gris ("Receta · 3 colores"). Toda la tarjeta es el link a la ficha. 2 columnas en móvil.
- **Cota:** línea roja de 1 px con dos topes verticales de 11 px y la medida en mono rojo 9 px. Se usa en el hero, en la ficha y sobre la cara.
- **Paneles (probador/ficha):** hoja blanca desde abajo, `border-radius: 22px 22px 0 0`, manija gris de 40×4 px.
- **Separadores:** líneas de 1 px `--linea` (servicios, FAQ).
- **Espaciado:** secciones con 40–48 px arriba/abajo, márgenes laterales 20 px.

## Secciones (orden del boceto)
Header (FOCO + Catálogo/Turnos) → Hero "Ver claro." con lente grande y cota → Catálogo → "Tu cara es el probador." (imagen con 3 puntos rojos y una cota) → Servicios (lista con líneas) → Lupa (tabla borrosa + lente que enfoca) + "Si leés esto borroso, te toca control." + Sacar turno → Obras sociales (chips) → Preguntas → Ubicación → Footer claro. Botón flotante de WhatsApp negro.

## Probador (UI)
- Video a pantalla completa. Arriba: píldora blanca translúcida con código + nombre, y botón cerrar redondo.
- Abajo: panel blanco con carrusel de miniaturas (seleccionado con borde negro 2 px), colores, "● TODO EN TU CELU" y botones "Sacar foto" (secundario) y "Lo quiero" (principal).
- Sobre la cara: solo 3 puntos rojos y una cota fina (intro de 1 s, después se desvanecen y queda el lente).

## Movimiento
Sutil: cotas que se dibujan, fade + subida corta de títulos, lente del hero que gira apenas con el scroll. Solo `transform`/`opacity`. `prefers-reduced-motion`: todo estático.

## Prohibido
Gradientes, glassmorphism pesado, sombras grandes, bordó, fondos negros por sección, mayúsculas en todo, demasiadas etiquetas técnicas, emojis en la UI, fotos de stock.
