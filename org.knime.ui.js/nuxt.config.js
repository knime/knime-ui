import path from 'path';
import postcssConfig from 'webapps-common/webpack/webpack.postcss.config';
import generateCss from './buildtools/generateCSS';
import svgConfig from 'webapps-common/webpack/webpack.svg.config';

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
    plugins: [
        // To work together with knime-ui-internal and to configure logging for the other plugins,
        // 'logger' must be plugin number zero
        '~/plugins/logger.js',
        '~/plugins/constants.js',
        '~/plugins/directive-move.js',
        '~/plugins/json-rpc-notification.js'
    ],
    modules: ['portal-vue/nuxt'],
    css: ['@/assets/index.css'],
    hooks: {
        build: {
            before: generateCss
        }
    },
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

            // limit nuxt default image rule to raster images because we want to handle svg ourselves
            const imgRule = config.module.rules.find(
                rule => String(rule.test) === String(/\.(png|jpe?g|gif|svg|webp|avif)$/i)
            );
            imgRule.test = /\.(png|jpe?g|gif|webp|avif)$/i;

            // custom image rule for SVG
            config.module.rules.push(svgConfig);
        }
    },
    generate: {
        fallback: 'index.html'
    }
};

export default config;
