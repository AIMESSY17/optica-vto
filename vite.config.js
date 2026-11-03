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

// Fotos editoriales (spec 08): <!--FOTO:nombre--> → <picture> AVIF/WebP con srcset si la foto existe
// (npm run fotos → public/fotos/editorial/gen/fotos.json); si no, un rectángulo de estudio con grano y [FOTO ...].
// <!--CREDITOS-FOTOS--> → autores de public/fotos/CREDITOS.md (solo de las fotos que están puestas).
const SIZES = {
  portada: '100vw',
  color: '(min-width: 1024px) 42vw, 100vw',
  lookbook: '(min-width: 1024px) 34vw, 50vw',
};
function fotosEditoriales() {
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const leer = (archivo, siFalta) => { try { return readFileSync(pagina(archivo), 'utf8'); } catch { return siFalta; } };
  const srcset = (n, d, ext) => d.anchos.map((a) => `/fotos/editorial/gen/${n}-${a}.${ext} ${a}w`).join(', ');
  const medio = (d) => d.anchos[Math.floor((d.anchos.length - 1) / 2)];
  const hueco = (texto) => `<div class="foto-hueco foto-cubre" aria-hidden="true"><span>[${texto}]</span></div>`;
  function picture(nombre, fotos) {
    if (nombre === 'portada') {
      const pc = fotos['portada-pc'], celu = fotos['portada-celu'];
      const base = celu ? 'portada-celu' : 'portada-pc', d = celu ?? pc;
      if (!d) return hueco('FOTO PORTADA');
      // Pantalla horizontal → foto horizontal; vertical → la vertical (si hay una sola, va para las dos).
      // Sin loading="lazy": es la imagen principal (LCP).
      const horiz = pc && celu ? `<source media="(min-aspect-ratio: 1/1)" type="image/avif" srcset="${srcset('portada-pc', pc, 'avif')}" sizes="100vw" width="${pc.ancho}" height="${pc.alto}" />
          <source media="(min-aspect-ratio: 1/1)" type="image/webp" srcset="${srcset('portada-pc', pc, 'webp')}" sizes="100vw" width="${pc.ancho}" height="${pc.alto}" />
          ` : '';
      return `<picture class="foto-cubre">
          ${horiz}<source type="image/avif" srcset="${srcset(base, d, 'avif')}" sizes="100vw" />
          <img src="/fotos/editorial/gen/${base}-${medio(d)}.webp" srcset="${srcset(base, d, 'webp')}" sizes="100vw" width="${d.ancho}" height="${d.alto}" alt="" fetchpriority="high" decoding="async" />
        </picture>`;
    }
    const d = fotos[nombre];
    if (!d) return hueco(nombre === 'color' ? 'FOTO COLOR' : `FOTO ${nombre.replace('-', ' ').toUpperCase()}`);
    const sizes = SIZES[nombre.split('-')[0]];
    return `<picture class="foto-cubre">
          <source type="image/avif" srcset="${srcset(nombre, d, 'avif')}" sizes="${sizes}" />
          <img src="/fotos/editorial/gen/${nombre}-${medio(d)}.webp" srcset="${srcset(nombre, d, 'webp')}" sizes="${sizes}" width="${d.ancho}" height="${d.alto}" alt="" loading="lazy" decoding="async" />
        </picture>`;
  }
  // Filas de la tabla de CREDITOS.md: | archivo.jpg | Autor | https://link | Sitio |
  function creditos(fotos) {
    const filas = leer('./public/fotos/CREDITOS.md', '').split('\n')
      .map((l) => l.split('|').map((c) => c.trim()))
      .filter((c) => /\.jpe?g$/i.test(c[1] ?? '') && c[2] && c[2] !== '—' && /^https?:\/\//.test(c[3] ?? ''))
      .filter((c) => fotos[c[1].replace(/\.jpe?g$/i, '').toLowerCase()]);
    const autores = new Map(); // un autor con varias fotos aparece una vez
    for (const c of filas) if (!autores.has(c[2])) autores.set(c[2], { link: c[3], sitio: c[4] && c[4] !== '—' ? c[4] : '' });
    if (!autores.size) return '';
    const items = [...autores].map(([autor, { link, sitio }]) => `<a href="${esc(link)}" target="_blank" rel="noopener">${esc(autor)}</a>${sitio ? ` / ${esc(sitio)}` : ''}`);
    return `<p class="pie-fotos">Fotos: ${items.join(' · ')}</p>`;
  }
  const vigilar = ['./public/fotos/editorial/gen/fotos.json', './public/fotos/CREDITOS.md'].map((a) => pagina(a).replace(/\\/g, '/'));
  return {
    name: 'fotos-editoriales',
    configureServer(server) {
      // En dev: al correr npm run fotos o editar los créditos, la página se recarga sola
      server.watcher.add(vigilar);
      server.watcher.on('all', (_, archivo) => {
        if (vigilar.includes(archivo.replace(/\\/g, '/'))) server.ws.send({ type: 'full-reload' });
      });
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        if (!html.includes('<!--FOTO:')) return html;
        const fotos = JSON.parse(leer('./public/fotos/editorial/gen/fotos.json', '{}'));
        // Tono de la franja donde va "FOCO" (scripts/fotos.mjs). Sin foto: rectángulo claro → FOCO negro.
        const pc = fotos['portada-pc']?.tono ?? fotos['portada-celu']?.tono ?? 'claro';
        const celu = fotos['portada-celu']?.tono ?? pc;
        return html
          .replace(/<!--FOTO:([\w-]+)-->/g, (_, n) => picture(n, fotos))
          .replace('__TONO_PC__', pc).replace('__TONO_CELU__', celu)
          .replace('<!--CREDITOS-FOTOS-->', creditos(fotos));
      },
    },
  };
}

export default defineConfig({
  // HTTPS en dev: la cámara del celu solo anda con https (spec 02 §1).
  plugins: [basicSsl(), seoDesdeSitio(), fotosEditoriales()],
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
