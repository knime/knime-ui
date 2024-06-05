import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import svgLoader from 'vite-svg-loader'
import vue from '@vitejs/plugin-vue'

// https://vitest.dev/config/
export default defineConfig(({ mode }) => {
  const env = { ...process.env, ...loadEnv(mode, process.cwd()) }

  const conditionalRollupOptions = { external: [], output: {} }

  return {
    define: {
      'process.env': env // needed by v-calendar
    },
    plugins: [vue(), svgLoader()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@@': fileURLToPath(new URL('.', import.meta.url))
      }
    },
    build: {
      lib: {
        entry: fileURLToPath(
          new URL(`./src/components/HelloWorld/helloWorldWrapperApp.ts`, import.meta.url)
        ),
        fileName: 'HelloWorld',
        formats: ['es']
      },
      emptyOutDir: false,
      cssCodeSplit: false,
      rollupOptions: {
        ...conditionalRollupOptions,
        ...{
          plugins: [
            {
              apply: 'build',
              enforce: 'post',
              name: 'macro-replace-css',
              generateBundle(opts, bundle) {
                // we only support this for ES format, umd uses the head injection
                if (opts.format !== 'es') {
                  return
                }
                const bundleKeys = Object.keys(bundle)
                const bundleFilename = bundleKeys.find((name) => name.endsWith('.js'))
                const cssFilename = bundleKeys.find((name) => name.endsWith('.css'))

                if (!bundleFilename || !cssFilename) {
                  // eslint-disable-next-line no-console
                  console.log('Do not call macro-replace-css')
                  return
                }

                const {
                  // @ts-ignore
                  [cssFilename]: { source: rawCss },
                  [bundleFilename]: component
                } = bundle

                // @ts-ignore
                component.code = component.code.replace(
                  '__INLINE_CSS_CODE__',
                  JSON.stringify(rawCss)
                )

                // remove css file from final bundle
                delete bundle[cssFilename]
              }
            }
          ]
        }
      }
    }
  }
})
