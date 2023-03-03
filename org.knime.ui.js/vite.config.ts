import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import svgLoader from 'vite-svg-loader';
import { configDefaults } from 'vitest/config';

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
                '@api': fileURLToPath(new URL('./src/api', import.meta.url))
            },
            /* Because of the possibility of having multiple distinct vue packages being loaded when using the PageBuilder
            the following needs to be added to not confuse vite/vue while rendering components.
            See also: https://github.com/vuejs/core/issues/4344 */
            dedupe: [
                'vue'
            ]
        },

        test: {
            include: ['**/__tests__/*.test.{js,mjs,cjs,ts,mts,cts}'],
            exclude: [...configDefaults.exclude, 'webapps-common'],
            setupFiles: ['src/test/setup'],
            environment: 'jsdom',
            reporters: ['default', 'junit'],
            coverage: {
                all: true,
                reportsDirectory: 'test-results',
                reporter: 'lcov',
                exclude: [
                    'test-results',
                    'src/test',
                    'target',
                    'bin',
                    'webapps-common',
                    'buildtools',
                    '.history',
                    'src/main.js',
                    'src/router/index.js',
                    'src/plugins/index.js',
                    'src/plugins/constants.js',
                    'src/store/index.js',
                    'coverage/**',
                    'dist/**',
                    '**/*.d.ts',
                    '**/__tests__/**', '**/{vite,vitest}.config.{js,cjs,mjs,ts}',
                    '**/.{eslint,prettier,stylelint}rc.{js,cjs,yml}'
                ]
            },
            outputFile: {
                // needed for Bitbucket Pipeline
                // see https://support.atlassian.com/bitbucket-cloud/docs/test-reporting-in-pipelines/
                junit: 'test-results/junit.xml'
            },
            root: fileURLToPath(new URL('./', import.meta.url))
        }
    };
});
