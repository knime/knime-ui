import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import svgLoader from 'vite-svg-loader';

import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default ({ mode }) => {
    process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };
    
    return defineConfig({
        plugins: [vue(), svgLoader()],
    
        server: {
            port: process.env.VITE_APP_PORT || 3000,
            watch: {
                ignored: ['**/coverage/**']
            }
        },
    
        resolve: {
            alias: {
                '@': path.join(__dirname, 'src'),
                '@api': path.join(__dirname, 'src', 'api', 'index.js'),
                'webapps-common': path.join(__dirname, 'webapps-common')
            }
        }
    });
};
