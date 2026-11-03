# 06 — Riesgos y plan B

| Riesgo | Impacto | Plan B |
|---|---|---|
| FPS bajos en celulares gama baja | El probador se ve trabado | Degradación en 3 niveles (02 §8); detectar cada 2 frames; modelo más liviano |
| GPU delegate falla en algunos Android/iOS | No arranca | Fallback automático a `delegate: 'CPU'` |
| iOS Safari: cámara no arranca | Pierde la mitad de usuarios | `playsinline muted`, HTTPS, iniciar solo tras un tap del usuario; probar en iPhone real temprano (F0) |
| Usuario niega la cámara | No puede probar | Plan B: subir selfie (R-09) |
| El lente "flota" o queda corrido | Se ve falso | Aspect ratio video = canvas; offset `AJUSTE_PUENTE` con debug; oclusor bien alineado |
| Patillas se ven encima de la cara | Se ve sticker | Oclusor con `colorWrite=false` + render order; agrandarlo un poco |
| Poca luz / contraluz | Detección pierde la cara | Mensaje "buscá más luz"; ocultar lente si no hay cara |
| Peso de MediaPipe (~3–4 MB modelo + wasm) | Primera apertura lenta | Precargar con `<link rel=prefetch>` cuando el usuario scrollea al catálogo; Service Worker |
| Licencias de modelos | Problema legal al vender | Solo CC0/CC-BY, créditos visibles, nada de videojuegos ni marcas reales |
| Marca real visible en un modelo | Problema legal | `--quitar "logo"` / limpiar textura (pendiente L01, L03) |
| La óptica pide sus lentes exactos | Más trabajo por cliente | Modelos base por familia + variantes de color + `--ancho` real (03) |
| Expectativa de medición médica | Reclamo | DIP solo "orientativa", texto legal claro |
