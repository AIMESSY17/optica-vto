# 01 — Requisitos

Cada requisito tiene un criterio de **listo** comprobable. Formato: `R-xx`.

## Probador (VTO)
| ID | Requisito | Listo cuando… |
|---|---|---|
| R-01 | Abrir la cámara frontal desde cualquier lente ("Probátelos") | Pide permiso, muestra la cámara en espejo, en < 3 s en 4G (después de la 1.ª vez, < 1 s por caché) |
| R-02 | El lente 3D sigue la cabeza (posición, giro, inclinación) | Girando la cabeza ±45° el lente no se despega de la nariz |
| R-03 | Las patillas se esconden detrás de la cara | De perfil, la patilla del lado lejano no se ve "encima" de la cara |
| R-04 | Tamaño realista | El lente se ve del ancho de la cara, ni de juguete ni gigante; escala estable |
| R-05 | Sin temblor | Con la cabeza quieta el lente no vibra (filtro de suavizado) |
| R-06 | Cambiar de lente sin cerrar la cámara | Carrusel inferior; el cambio tarda < 500 ms (precarga del siguiente) |
| R-07 | Cambiar color/variante (si el lente tiene) | Recolorea `FRAME_*` / `LENS_*` en vivo |
| R-08 | Sacar foto con el lente puesto | Botón captura → compartir (Web Share) o descargar; la foto incluye marca FOCO y código del lente |
| R-09 | Plan B sin cámara | Si niega el permiso o no hay cámara: subir una selfie y probarse sobre la foto |
| R-10 | Rendimiento | ≥ 30 FPS en gama media (ej. Moto G / Samsung A), ≥ 24 FPS en gama baja; si baja, degradar (ver 02) |
| R-11 | Funciona en Chrome Android y Safari iOS 16+ | Probado en los dos con la URL real HTTPS |
| R-12 | Privacidad visible | Texto: "Tu cámara no se graba ni se sube: todo pasa en tu celular" |
| R-13 | Intro "ficha técnica" | Al detectar la cara, 1 s de puntos rojos y líneas de medida (estética 03-ficha-tecnica) y luego aparece el lente |

## Página de la óptica
| ID | Requisito | Listo cuando… |
|---|---|---|
| R-20 | Catálogo filtrable | Filtros: Receta / Sol, familia (cuadrado, redondo, cat-eye, aviador…), color. Sin recargar |
| R-21 | Ficha de lente | Código (L01…), nombre, medidas, colores, precio o "consultar", botones Probátelos + Consultar |
| R-22 | Consulta por WhatsApp | Mensaje autogenerado con nombre, código, color elegido y link a la ficha |
| R-23 | Turnos | Botón fijo "Sacar turno" → motivo (control de vista, lentes de contacto, receta, sol, taller) → WhatsApp armado |
| R-24 | Servicios | Control de vista, contactología, laboratorio/armado, taller de reparación |
| R-25 | Obras sociales | Lista visible (editable) |
| R-26 | Ubicación y horario | Dirección, mapa (link a Google Maps, no iframe pesado), horarios |
| R-27 | Preguntas frecuentes | Mín. 6 (receta, tiempos de armado, obras sociales, garantía, probador, envíos) |
| R-28 | Créditos 3D | Sección en el pie con `CREDITOS.md` |
| R-29 | SEO local básico | Title/description, Open Graph con imagen, datos de negocio local (schema.org Optician) |

## No funcionales
| ID | Requisito | Listo cuando… |
|---|---|---|
| R-40 | Carga inicial rápida | LCP < 2,5 s en 4G simulado; JS inicial < 60 KB gzip (sin three/mediapipe) |
| R-41 | Peso del probador | three + mediapipe + modelo + 1 GLB se cargan solo al abrirlo |
| R-42 | Accesible | Contraste AA, foco visible, `prefers-reduced-motion` respeta |
| R-43 | Editable sin código (F4) | La óptica carga lentes, precios y textos desde un panel |
