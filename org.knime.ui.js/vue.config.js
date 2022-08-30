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
                '@api': path.join(__dirname, 'api', 'index.js'),
                '@': path.join(__dirname)
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
            // load svgs as data-url
            .oneOf('data-url')
            .resourceQuery(/data/)
            .use('url-loader')
            .loader('url-loader')
            .end()
            .end()
            // load svgs as file imports
            .oneOf('file-import')
            .resourceQuery(/file/)
            .use('file-loader')
            .loader('file-loader')
            .options({
                name: 'assets/[name].[hash:8].[ext]'
            })
            .end()
            .end()
            // load svgs as inlined elements
            .oneOf('inline')
            .use('vue-loader')
            .loader('vue-loader')
            .end()
            .use('vue-svg-loader')
            .loader('vue-svg-loader');
    }
});
