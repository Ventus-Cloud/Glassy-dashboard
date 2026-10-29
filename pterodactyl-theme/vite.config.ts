import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath, URL } from 'node:url';

// `npm run build` genera dist/index.html con JS y CSS en línea: una vista previa
// autocontenida que se abre con doble clic, sin servidor.
export default defineConfig({
    plugins: [react(), tailwindcss(), viteSingleFile()],
    resolve: {
        // Mismo alias que usa Pterodactyl en resources/scripts.
        alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
});
