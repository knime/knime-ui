const { defineConfig } = require('@vue/cli-service');

const path = require('path');

module.exports = defineConfig({
    transpileDependencies: true,
    devServer: {
        port: process.env.VUE_APP_PORT || 3000
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
                '~': path.join(__dirname)
                // This is required for Vue directives etc. which modify the imported Vue object
                // vue: path.join(__dirname, 'node_modules', 'vue', 'dist', 'vue.js')
            }
        }
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
