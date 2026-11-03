// Registra el Service Worker que guarda lo pesado del probador en el celu (T1.9, public/sw.js).
// Liviano: la página lo llama al cargar. No descarga nada: el SW guarda solo lo que el probador pide al abrirse.
// En desarrollo (npm run dev) no se registra, para no servir archivos viejos mientras se edita; ?sw=1 lo fuerza.
export function registrarCacheProbador() {
  if (!('serviceWorker' in navigator)) return;
  const forzar = new URLSearchParams(location.search).get('sw') === '1';
  if (!import.meta.env.PROD && !forzar) return;
  const base = import.meta.env.BASE_URL;
  const registrar = () =>
    navigator.serviceWorker.register(base + 'sw.js', { scope: base }).catch((e) => console.warn('[vto] sin caché offline', e));
  // Después de la carga, para no competir con lo que la página necesita primero.
  if (document.readyState === 'complete') registrar();
  else addEventListener('load', registrar, { once: true });
}
