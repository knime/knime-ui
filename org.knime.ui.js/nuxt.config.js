import postcssConfig from '~/webapps-common/webpack/webpack.postcss.config';

export default {
    mode: 'spa',
    head: {
        meta: [
            { charset: 'utf-8' },
            { name: 'viewport', content: 'width=device-width, initial-scale=1' },
            { hid: 'description', name: 'description', content: process.env.npm_package_description || '' }
        ]
    },
    loading: false,
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
                debugger;
            }
        }
    },
    generate: {
        fallback: 'index.html'
    }
};
