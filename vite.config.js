import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const pagina = (archivo) => fileURLToPath(new URL(archivo, import.meta.url));

// SEO local (T3.9, R-29): título, descripción, Open Graph y schema.org Optician salen de public/data/sitio.json.
// Así, al cambiar la marca (T5.3) se cambia un solo archivo. Reemplaza <!--SEO--> en index.html.
function seoDesdeSitio() {
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const real = (t) => t && !/\[|X{4}/.test(t); // sin [CORCHETES] ni números de relleno
  return {
    name: 'seo-desde-sitio',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        if (!html.includes('<!--SEO-->')) return html;
        const sitio = JSON.parse(readFileSync(pagina('./public/data/sitio.json'), 'utf8'));
        const { marca, seo } = sitio;
        const url = marca.url.replace(/\/$/, '');
        const imagen = `${url}/img/og.jpg`;
        const negocio = {
          '@context': 'https://schema.org',
          '@type': 'Optician',
          name: marca.nombre,
          description: seo.descripcion,
          url,
          image: imagen,
          address: {
            '@type': 'PostalAddress',
            ...(real(sitio.direccion) ? { streetAddress: sitio.direccion.split(',')[0] } : {}),
            addressLocality: marca.ciudad,
            addressRegion: marca.provincia,
            addressCountry: 'AR',
          },
          ...(real(marca.whatsapp) ? { telephone: `+${marca.whatsapp}` } : {}),
          ...(marca.instagram ? { sameAs: [marca.instagram] } : {}),
          ...(sitio.horarios.every((h) => real(h.horas)) ? { openingHours: sitio.horarios.map((h) => `${h.dias} ${h.horas}`) } : {}),
        };
        const etiquetas = `<title>${esc(seo.titulo)}</title>
    <meta name="description" content="${esc(seo.descripcion)}" />
    <link rel="canonical" href="${esc(url)}/" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="es_AR" />
    <meta property="og:site_name" content="${esc(marca.nombre)}" />
    <meta property="og:title" content="${esc(seo.titulo)}" />
    <meta property="og:description" content="${esc(seo.descripcion)}" />
    <meta property="og:url" content="${esc(url)}/" />
    <meta property="og:image" content="${esc(imagen)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <script type="application/ld+json">${JSON.stringify(negocio).replace(/</g, '\\u003c')}</script>`;
        return html.replace('<!--SEO-->', etiquetas);
      },
    },
  };
}

export default defineConfig({
  // HTTPS en dev: la cámara del celu solo anda con https (spec 02 §1).
  plugins: [basicSsl(), seoDesdeSitio()],
  server: { host: true },
  preview: { host: true },
  build: {
    // El chunk grande (three + mediapipe) se carga solo al abrir el probador: es esperado.
    chunkSizeWarningLimit: 1000,
    // main.js usa await al arrancar (carga de datos): navegadores con soporte de top-level await.
    target: 'es2022',
    rolldownOptions: {
      input: {
        main: pagina('./index.html'),
        vtoTest: pagina('./vto-test.html'),
      },
    },
  },
});
