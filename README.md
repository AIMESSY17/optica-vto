# Óptica VTO — demo FOCO

Página para ópticas con probador virtual de lentes en la cara. Proyecto de La PYME.

## Arrancar con Claude Code en VS Code
1. Descomprimí esta carpeta, abrila en VS Code y corré `git init`.
2. Abrí Claude Code. Lee `CLAUDE.md` solo, y ahí están las reglas y el método.
3. Decile qué fase hacer. Por ejemplo: **"Leé las specs y hacé la fase F0 de specs/tasks.md"**.
4. Cuando termine la fase, probala en el celular, revisá que se cumpla el "listo" y recién ahí pasá a la siguiente.

## Probar el probador (F0)
1. `npm install` (la primera vez; también copia los archivos de MediaPipe a `public/mediapipe/`).
2. `npm run dev`. En la consola aparece una dirección **Network**, tipo `https://192.168.x.x:5173/`. Si el puerto está ocupado, Vite usa el siguiente (5174…): mirá cuál dice.
3. En el celular (misma Wi-Fi) abrí esa dirección + `/vto-test.html?debug=1`. Va a decir "conexión no privada": tocá *Avanzado → Continuar* (es el certificado de prueba, en Vercel no pasa).
4. Tocá **Abrir cámara** y aceptá el permiso.

Qué muestra el panel `debug` (abajo, se pliega tocándolo):
- **fps**: cuadros por segundo. La cámara da como máximo ~30. En rojo si baja de 28.
- **GPU / CPU**: con qué procesa MediaPipe (si la GPU falla, pasa solo a CPU).
- **movimiento por cuadro**: con la cabeza quieta tiene que dar casi 0 (R-05). "crudo" = sin suavizado.
- **ver oclusor**: muestra la cara invisible en rojo, para ver si calza con tu cara.
- **ajuste X/Y/Z**: corre el lente respecto del puente de la nariz. "copiar valores" copia los números para pasarlos a `src/vto/constantes.js`.
- `&lente=S01` en la dirección prueba otro lente (L01…L06, S01, S02).

## Subir a Vercel (T0.8)
1. Crear un repo en GitHub (cuenta AIMESSY17) y subir este proyecto (`git push`).
2. En vercel.com → *Add New → Project* → elegir el repo. Detecta Vite solo: no hay que tocar nada.
3. Abrir `https://<tu-proyecto>.vercel.app/vto-test.html?debug=1` en el Android y en el iPhone y anotar los FPS en `specs/tasks.md`.

## Carpetas
- `CLAUDE.md`: reglas del proyecto para Claude Code.
- `specs/`: qué hay que construir (SDD). `tasks.md` es la lista de tareas por fase.
- `public/models/`: los 8 lentes 3D listos, más las miniaturas, el oclusor y `catalogo.json`.
- `src/vto/`: motor del probador (cámara, MediaPipe, 3D, suavizado). `vto-test.html` es la página de prueba de F0.
- `scripts/normalizar.mjs`: prepara cualquier lente nuevo.
- `scripts/preparar-mediapipe.mjs`: copia el wasm y baja el modelo de MediaPipe (corre solo con `npm install`).
- `docs/referencias/`: tus referencias visuales.
- `CREDITOS.md`: créditos obligatorios de los modelos.
