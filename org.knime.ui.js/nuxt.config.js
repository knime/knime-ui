import postcssConfig from 'webapps-common/webpack/webpack.postcss.config';
require('dotenv').config();

const config = {
    mode: 'spa',
    head: {
        meta: [
            { charset: 'utf-8' },
            { name: 'viewport', content: 'width=device-width, initial-scale=1' },
            { hid: 'description', name: 'description', content: process.env.npm_package_description || '' }
        ]
    },
    loading: false,
    plugins: ['~/plugins/constance.js'],
    modules: ['portal-vue/nuxt'],
    css: ['@/assets/index.css'],
    build: {
        postcss: postcssConfig,
        splitChunks: {
            layouts: false,
            pages: false,
            commons: false
        },
        extractCSS: true,
        optimization: {
            splitChunks: {
                cacheGroups: {
                    styles: {
                        name: 'styles',
                        test: /\.(css|vue)$/,
                        chunks: 'all',
                        enforce: true
                    }
                }
            }
        },
        extend(config, { isDev, loaders }) {
            if (!isDev) {
                // embed all images and fonts
                loaders.fontUrl.limit = Infinity;
                loaders.imgUrl.limit = Infinity;
            }
        }
    },
    generate: {
        fallback: 'index.html'
    }
};

if (process.env.NODE_ENV === 'development') {
    config.dev = true;
    if (String(process.env.DEV_INCLUDE_DEBUG_CSS) === 'true') {
        config.css.push('@/assets/debug.css');
    }
}
console.log(config.css);

export default config;
