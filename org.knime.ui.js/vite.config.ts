import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import svgLoader from 'vite-svg-loader';

export default defineConfig(({ mode }) => {
    process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };

    return {
        plugins: [vue(), svgLoader()],

        server: {
            port: Number(process.env.VITE_APP_PORT) || 3000,
            watch: {
                ignored: ['**/test-results/**']
            }
        },

        resolve: {
            alias: {
                '@': fileURLToPath(new URL('./src', import.meta.url)),
                '@api': fileURLToPath(new URL('./src/api/index', import.meta.url))
            }
        }
    };
});
