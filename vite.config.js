import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { fileURLToPath } from 'node:url';

const pagina = (archivo) => fileURLToPath(new URL(archivo, import.meta.url));

export default defineConfig({
  // HTTPS en dev: la cámara del celu solo anda con https (spec 02 §1).
  plugins: [basicSsl()],
  server: { host: true },
  preview: { host: true },
  build: {
    // El chunk grande (three + mediapipe) se carga solo al abrir el probador: es esperado.
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      input: {
        main: pagina('./index.html'),
        vtoTest: pagina('./vto-test.html'),
      },
    },
  },
});
