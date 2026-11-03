# Óptica VTO — demo FOCO

Página para ópticas con probador virtual de lentes en la cara. Proyecto de La PYME.

## Arrancar con Claude Code en VS Code
1. Descomprimí esta carpeta, abrila en VS Code y corré `git init`.
2. Abrí Claude Code. Lee `CLAUDE.md` solo, y ahí están las reglas y el método.
3. Decile qué fase hacer. Por ejemplo: **"Leé las specs y hacé la fase F0 de specs/tasks.md"**.
4. Cuando termine la fase, probala en el celular, revisá que se cumpla el "listo" y recién ahí pasá a la siguiente.

## Carpetas
- `CLAUDE.md`: reglas del proyecto para Claude Code.
- `specs/`: qué hay que construir (SDD). `tasks.md` es la lista de tareas por fase.
- `public/models/`: los 8 lentes 3D listos, más las miniaturas, el oclusor y `catalogo.json`.
- `scripts/normalizar.mjs`: prepara cualquier lente nuevo.
- `docs/referencias/`: tus referencias visuales.
- `CREDITOS.md`: créditos obligatorios de los modelos.
