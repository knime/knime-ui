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
        }
    },
    generate: {
        fallback: 'index.html'
    }
};
