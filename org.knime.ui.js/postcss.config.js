// eslint-disable-next-line import/extensions
const { preset, plugins, order } = require('webapps-common/webpack/webpack.postcss.config.js');

module.exports = {
    plugins: {
        ...plugins,
        'postcss-preset-env': preset,
        'postcss-url': {
            url: 'copy'
        }
    },

    order
};
