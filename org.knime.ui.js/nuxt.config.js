import path from 'path';
import postcssConfig from 'webapps-common/webpack/webpack.postcss.config';

const srcDir = path.resolve(__dirname);
const commonsDir = path.resolve(srcDir, 'webapps-common');

const config = {
    alias: {
        'webapps-common': commonsDir
    },
    mode: 'spa',
    head: {
        meta: [
            { charset: 'utf-8' },
            { name: 'viewport', content: 'width=device-width, initial-scale=1' },
            { hid: 'description', name: 'description', content: process.env.npm_package_description || '' }
        ]
    },
    loading: false,
    plugins: ['~/plugins/constants.js'],
    modules: ['portal-vue/nuxt'],
    css: ['@/assets/index.css'],
    build: {
        postcss: {
            ...postcssConfig,
            plugins: {
                'postcss-import': {},
                'postcss-url': {}
            }
        },
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
            config.resolve.alias['~api'] = path.join(__dirname, 'api', 'index.js');
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

export default config;
