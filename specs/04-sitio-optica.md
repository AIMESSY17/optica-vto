# 04 — Sitio de la óptica (demo FOCO)

Una sola página larga (`index.html`) + ficha por lente como vista dentro de la misma página (`#lente/L03`, sin recargar). Todo el contenido editable sale de `public/data/sitio.json` y `public/models/catalogo.json`.

## Secciones (en orden)
1. **Header mínimo:** logo FOCO · "Catálogo" · "Turnos".
2. **Hero "Ver claro.":** título grande + el lente grande debajo con una cota roja fina (142 MM). El lente es una **imagen** (miniatura de frente del lente elegido en `sitio.json`) que gira apenas con el scroll; no se carga 3D en el hero (decisión aprobada: más liviano y el 3D queda para el probador). CTA principal "Probátelos en tu cara" + "Ver catálogo →".
3. (sin tira técnica: se sacó para alivianar)
4. **Catálogo:** chips Todos / Receta / Sol / Forma ▾. Tarjetas livianas (ver 05): miniatura, código rojo chico, nombre y subtítulo ("Receta · 3 colores"). Toda la tarjeta abre la ficha; "Probar" está en la ficha y en el probador.
5. **El probador explicado:** 3 pasos cortos + "tu cámara no se graba ni se sube" + botón.
6. **Servicios:** control de vista, lentes de contacto, laboratorio y armado, taller de reparación. Cada uno con botón "Sacar turno" que preselecciona el motivo.
7. **Lupa "ver claro":** bloque interactivo: una tabla optométrica borrosa y el dedo/cursor es un lente que la enfoca (ref. 02). Implementación barata: dos capas (borrosa pre-renderizada y nítida) + `clip-path: circle()` que sigue el puntero. Nada de `backdrop-filter`.
8. **Obras sociales:** lista en chips.
9. **Preguntas frecuentes:** acordeón (`<details>`).
10. **Ubicación y horario:** dirección, horarios, botón a Google Maps (link, no iframe).
11. **Footer:** redes, WhatsApp, créditos 3D, "sitio hecho por La PYME" (link de venta).
12. **Botón flotante WhatsApp** (no tapa el botón de "Probátelos" en el probador).

## Ficha de lente (`#lente/L03`)
Panel deslizante desde abajo en móvil: miniaturas frente/3/4 grandes, medidas en formato `52□18 140` con un mini dibujo técnico, variantes de color, "Probátelos", "Consultar por WhatsApp", lentes similares (misma familia).

## Mensajes de WhatsApp (texto exacto, editable en sitio.json)
- Consulta: `Hola FOCO! Me probé el {nombre} ({codigo}) en color {color} en la web y me interesa. ¿Tienen stock y precio con mi obra social? {link}`
- Turno: `Hola FOCO! Quiero sacar turno para: {motivo}. Mi nombre es: ` (el usuario completa).

## sitio.json (estructura)
```json
{
  "marca": { "nombre": "FOCO", "slogan": "Ver claro", "whatsapp": "549XXXXXXXXXX", "instagram": "" },
  "direccion": "…", "maps_url": "…", "horarios": [{ "dias": "Lun a Vie", "horas": "9:30–13 / 16–20" }],
  "servicios": [...], "obras_sociales": [...], "faq": [{ "p": "…", "r": "…" }]
}
```
