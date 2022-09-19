// eslint-disable-next-line import/extensions
const { preset } = require('webapps-common/webpack/webpack.postcss.config.js');

module.exports = {
    plugins: {
        'postcss-preset-env': preset
    }
};
