module.exports = {
  extends: ["@knime/eslint-config/stylelint/vue"],
  rules: {
    "media-feature-range-notation": null,
    "csstools/value-no-unknown-custom-properties": [
      true,
      {
        importFrom: [
          "src/assets/index.css",
          "node_modules/@knime/kds-styles/dist/tokens/css/_variables.css",
        ],
      },
    ],
    "at-rule-no-unknown": [
      true,
      {
        ignoreAtRules: ["define-mixin", "mixin"],
      },
    ],
  },
};
