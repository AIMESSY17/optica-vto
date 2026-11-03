// Service Worker del probador (T1.9, spec 02 §9): guarda en el celu lo pesado del probador
// (MediaPipe, wasm, lentes 3D, oclusor, miniaturas y el código del motor) para que la segunda vez abra en < 1 s.
// No descarga nada por adelantado: guarda lo que el probador ya pidió (la página inicial sigue liviana).
const VERSION = 'foco-vto-v1';

// Qué se guarda y cómo:
//   'primero-cache'      → lo guardado y listo. Para archivos que no cambian: con hash en el nombre
//                          (/assets/motor-XXXX.js) y MediaPipe (varios MB; cambia solo al actualizar la
//                          librería: ahí subir VERSION para que se baje de nuevo).
//   'cache-y-actualizar' → se sirve lo guardado al instante y se actualiza por atrás (son livianos;
//                          si cambia un GLB, la próxima vez ya viene el nuevo).
const REGLAS = [
  { patron: /\/assets\/[^/]+-[\w-]{8,}\.(js|css)$/, modo: 'primero-cache' },
  { patron: /\/mediapipe\//, modo: 'primero-cache' },
  { patron: /\/models\/(ready|occluder|thumbs)\//, modo: 'cache-y-actualizar' },
];

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const nombre of await caches.keys()) if (nombre !== VERSION) await caches.delete(nombre);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const regla = REGLAS.find((r) => r.patron.test(url.pathname));
  if (!regla) return; // HTML, catálogo y el resto: como siempre (red)
  e.respondWith(regla.modo === 'primero-cache' ? primeroCache(e, req) : cacheYActualizar(e, req));
});

async function guardar(req, res) {
  if (!res || !res.ok || res.type === 'opaque') return;
  const cache = await caches.open(VERSION);
  await cache.put(req, res);
}

async function primeroCache(e, req) {
  const guardado = await caches.match(req);
  if (guardado) return guardado;
  const res = await fetch(req);
  e.waitUntil(guardar(req, res.clone()));
  return res;
}

async function cacheYActualizar(e, req) {
  const guardado = await caches.match(req);
  const red = fetch(req).then((res) => {
    e.waitUntil(guardar(req, res.clone()));
    return res;
  });
  if (guardado) {
    e.waitUntil(red.catch(() => {})); // actualizar por atrás; si no hay red, no pasa nada
    return guardado;
  }
  return red;
}
