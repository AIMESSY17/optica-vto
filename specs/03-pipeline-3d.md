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
   - `--listar`: muestra las piezas numeradas (nombre, vértices, material, medidas en mm) y sale sin escribir nada. Usarlo primero para ver qué trae el modelo.
   - `--quitar-piezas 1,3`: borra piezas por el número que dio `--listar`. Sirve para logos modelados en 3D cuando todas las piezas se llaman igual y `--quitar` no alcanza.
   ```bash
   node scripts/normalizar.mjs raw/x.glb salida.glb --listar
   node scripts/normalizar.mjs raw/x.glb public/models/ready/x.glb --ancho 140 --cristal "lens" --quitar-piezas 4,7
   ```
4. Si la textura trae una marca o logo pintado, taparlo con `scripts/tapar-textura.mjs` (copia encima un parche limpio de al lado, con bordes suaves):
   ```bash
   # ver las texturas para ubicar la marca (zona vacía + --ver)
   npm run tapar-textura -- public/models/ready/x.glb tmp.glb --material FRAME_0 --zona base:0,0,1,1:0,0 --ver revisar/
   # tapar: zona x,y,ancho,alto en px de esa textura; dx,dy = de dónde copiar
   npm run tapar-textura -- public/models/ready/x.glb public/models/ready/x.glb --material FRAME_0 --zona base:715,422,205,40:0,-45
   ```
   Mapas: `base | mr | normal | ao | emisivo`. En vez de `dx,dy` se puede poner `liso` (rellena con el color de alrededor). `--quitar-sin-uso` borra texturas que no usa ningún material visible.
5. Generar miniaturas (frente y 3/4, WebP transparente, con los mismos cristales y color inicial que el probador):
   ```bash
   npm run miniaturas              # todos los del catálogo
   npm run miniaturas -- L07 L08   # solo esos (código o id)
   npm run miniaturas -- --salida comparar/   # en otra carpeta, para comparar antes de pisar
   ```
   Necesita Chromium de Playwright (`npx playwright install chromium`, una vez) o Chrome instalado. Sumarlo a `catalogo.json` + `CREDITOS.md`.
6. Probarlo en el probador con `?debug=1`. Si queda corrido, ajustar `--ancho` o la rotación, no el código del motor.

## Recolorear (variantes) y cristales
Las variantes de color de un mismo lente NO son archivos nuevos: se definen en el catálogo y se aplican cambiando `FRAME_*` (los cristales no se tocan). Código: `src/vto/variantes.js`.

Campos de cada lente en `catalogo.json`:
- **`variantes`**: lista de colores. Cada una: `nombre`, `muestra` (color del chip), y o bien `original: true` (el material tal cual viene en el modelo) o `frame: { color, roughness, metalness, opacity, procedural }`. `procedural: "carey"` genera la textura de carey en el código (ruido, sin archivo ni UVs). La variante con `original: true` es la que se muestra primero; si no hay, la primera.
- **`recolorear`** (opcional): qué `FRAME_*` cambian al elegir color. Si no está, se recolorean todos los `FRAME_*` opacos (almohadillas y puntas transparentes quedan como vienen). Usarlo cuando el modelo tiene piezas que no deben cambiar (ej. bisagras, plaquetas).
- **`cristal.tinte`** (opcional): color de los cristales. Pisa el tinte por defecto de sol (`#2A2C26`) o el de receta.

Ejemplo (lente de sol dorado con dos colores, solo el aro y el puente se recolorean, tinte verde oscuro):
```json
{
  "codigo": "S01",
  "id": "sol-aviador-dorado",
  "tipo": "sol",
  "variantes": [
    { "nombre": "Dorado", "muestra": "#C9A55A", "original": true },
    { "nombre": "Negro mate", "muestra": "#1E1E1E",
      "frame": { "color": "#1A1A1A", "metalness": 0.6, "roughness": 0.35 } }
  ],
  "recolorear": ["FRAME_0", "FRAME_3"],
  "cristal": { "tinte": "#2F3229" }
}
```
Otros ejemplos de `frame`: carey `{ "procedural": "carey", "roughness": 0.3, "metalness": 0 }` · acetato cristal `{ "color": "#E8E4DC", "opacity": 0.55 }`.

## Lentes de una óptica real (después de la demo)
Elegir el modelo base más parecido de la misma familia → ajustar `--ancho` a su medida real (calibre×2 + puente + ~2×aro) → variante de color/textura sacada de la foto del producto. Pedirle a la óptica: foto de frente, perfil y arriba con fondo blanco + las medidas impresas en la patilla (ej. `52□18 140`).

## Pendientes conocidos
- L01 y L03: marcas de la textura de la patilla tapadas con `tapar-textura.mjs` (T2.4); en L03 además se quitaron las placas con el nombre (`--quitar-piezas`).
- L01 conserva un contorno muy tenue **modelado** (no es textura) en la patilla. **Aceptado así:** a distancia de probador no se nota y quitarlo implicaría editar la malla.
- L02 no trae cristales → el motor agrega un plano transparente con la forma del aro o se deja sin cristal.
