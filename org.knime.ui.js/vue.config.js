const { defineConfig } = require('@vue/cli-service');

const path = require('path');
// const srcDir = path.resolve(__dirname);
// const commonsDir = path.join(knime_ui_dir, 'webapps-common');

module.exports = defineConfig({
    transpileDependencies: true,
    devServer: {
        port: 3000
    },
    pages: {
        index: {
            entry: './main.js'
        }
    },
    configureWebpack: {
        resolve: {
            alias: {
                '~api': path.join(__dirname, 'api', 'index.js'),
                '@': path.join(__dirname),
                '~': path.join(__dirname),
                '~assets': path.join(__dirname, 'assets')
            // consola: path.join(__dirname, 'devtools', 'consolaImportError.js'),
            // This is required for Vue directives etc. which modify the imported Vue object
            // vue: path.join(__dirname, 'node_modules', 'vue', 'dist', 'vue.js')
            }
        }
    },
    css: {
        extract: false
    },

    chainWebpack: (config) => {
        /* our SVG rule in webapps-common isn't compatible with VueCLI 5 / Webpack 5 */
        const svgRule = config.module.rule('svg');
        svgRule.uses.clear();
        svgRule.delete('type');
        svgRule.delete('generator');
        svgRule
            .use('vue-loader')
            .loader('vue-loader')
            .end()
            .use('vue-svg-loader')
            .loader('vue-svg-loader');
    }
});
