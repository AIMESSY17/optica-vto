# 03 — Pipeline de modelos 3D

## Estado actual: HECHO para la demo
8 lentes listos en `public/models/ready/` (ver `docs/catalogo-en-cara.png`), con miniaturas en `public/models/thumbs/` y ficha en `public/models/catalogo.json`.

| Código | Archivo | Tipo | Familia |
|---|---|---|---|
| L01 | optico-acetato-negro | receta | cuadrado grueso |
| L02 | optico-rectangular-negro | receta | rectangular (sin cristales en el modelo) |
| L03 | optico-cateye-carey | receta | cat-eye |
| L04 | optico-panto-negro | receta | redondo panto |
| L05 | optico-redondo-dorado | receta | redondo metal |
| L06 | optico-medio-aro-negro | receta | medio aro |
| S01 | sol-aviador-dorado | sol | aviador |
| S02 | sol-redondo-steampunk | sol | redondo |

## Convención (no romper)
- Metros. Y arriba. Frente mirando a +Z, patillas hacia -Z.
- Origen = puente de la nariz, centrado entre los cristales.
- `ancho_total_mm` del catálogo = ancho real del frente aplicado al modelo.
- Materiales `LENS_*` (cristales) y `FRAME_*` (marco).
- Meshopt + texturas WebP ≤ 1024 px. Objetivo ≤ 60 k triángulos y ≤ 1 MB por lente.

## Agregar un lente
1. Bajar de Sketchfab en **glTF (.glb)**, solo licencia **CC0 o CC-BY**. Anotar link y autor.
2. Mirar en el inspector de Sketchfab cómo se llama el material del cristal.
3. Normalizar:
   ```bash
   node scripts/normalizar.mjs raw/x.glb public/models/ready/x.glb --ancho 140 --cristal "lens|glass"
   ```
   Opciones: `--rotar x-90|x90|y90|y-90|z90|z-90` · `--cristal-claro` (sol→receta) · `--sin-textura-cristal` · `--quitar "logo"` · `--max-tris 60000`.
4. Generar miniaturas (`scripts/miniaturas.mjs`, tarea de F2) y sumarlo a `catalogo.json` + `CREDITOS.md`.
5. Probarlo en el probador con `?debug=1`. Si queda corrido, ajustar `--ancho` o la rotación, no el código del motor.

## Recolorear (variantes)
Las variantes de color de un mismo lente NO son archivos nuevos: se definen en el catálogo y se aplican cambiando `FRAME_*`:
```json
"variantes": [
  { "nombre": "Negro brillo", "frame": { "color": "#0E0E0E", "roughness": 0.25 } },
  { "nombre": "Carey", "frame": { "textura": "/models/texturas/carey.webp" } },
  { "nombre": "Cristal", "frame": { "color": "#E8E4DC", "opacity": 0.55 } }
]
```
Texturas de carey/acetato: generarlas procedural (ruido) o de fuente CC0.

## Lentes de una óptica real (después de la demo)
Elegir el modelo base más parecido de la misma familia → ajustar `--ancho` a su medida real (calibre×2 + puente + ~2×aro) → variante de color/textura sacada de la foto del producto. Pedirle a la óptica: foto de frente, perfil y arriba con fondo blanco + las medidas impresas en la patilla (ej. `52□18 140`).

## Pendientes conocidos
- L01 y L03 tienen una marca muy tenue en la textura de la patilla → limpiar la textura (pintar esa zona) en F2.
- L02 no trae cristales → el motor agrega un plano transparente con la forma del aro o se deja sin cristal.
