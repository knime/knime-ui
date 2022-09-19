import { defineConfig, loadEnv } from 'vite';
import { createVuePlugin as vue } from 'vite-plugin-vue2';
import { createSvgPlugin } from 'vite-plugin-vue2-svg';

import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default ({ mode }) => {
    process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };
    
    return defineConfig({
        plugins: [vue(), createSvgPlugin()],
    
        server: {
            port: process.env.VITE_APP_PORT || 3000
        },
    
        resolve: {
            alias: {
                '@': path.join(__dirname, 'src'),
                '@api': path.join(__dirname, 'src', 'api', 'index.js'),
                'webapps-common': path.join(__dirname, 'webapps-common'),
                'knime-ui-extension-service': path.join(__dirname, 'knime-ui-extension-service')
            }
        }
    });
};
