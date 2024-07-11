// eslint-disable-next-line import/extensions
const { preset } = require("@knime/styles/config/postcss.config.cjs");

module.exports = {
  plugins: {
    "postcss-mixins": {},
    "postcss-preset-env": preset,
  },
};
