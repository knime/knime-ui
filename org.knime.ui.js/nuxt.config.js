import path from 'path';
import postcssConfig from 'webapps-common/webpack/webpack.postcss.config';
import generateCSS from './buildtools/generateCSS';
import svgConfig from 'webapps-common/webpack/webpack.svg.config';
require('dotenv').config();

const srcDir = path.resolve(__dirname);
const commonsDir = path.resolve(srcDir, 'webapps-common');

const config = {
    alias: {
        'webapps-common': commonsDir
    },
    env: {
        isDev: process.env.NODE_ENV !== 'production'
    },
    ssr: false,
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
        '~/plugins/events.js',
        '~/plugins/equo-comm.js',
        '~/plugins/commands.js'
    ],
    modules: ['portal-vue/nuxt'],
    css: ['@/assets/index.css'],
    hooks: {
        build: {
            before: generateCSS
        }
    },
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
            config.resolve.alias['~api'] = path.join(__dirname, 'api', 'index.js');

            if (!isDev) {
                // embed all images and fonts
                loaders.fontUrl.limit = Infinity;
                loaders.imgUrl.limit = Infinity;
            }

            // limit nuxt default image rule to raster images because we want to handle svg ourselves
            const svgRule = config.module.rules.find(rule => rule.test.source.includes('svg'));
            svgRule.test = new RegExp(svgRule.test.source.replace('svg|', '').replace('|svg'), 'i');

            // custom image rule for SVG
            config.module.rules.push(svgConfig);
        }
    },
    generate: {
        fallback: 'index.html'
    }
};

export default config;
