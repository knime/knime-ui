require("@rushstack/eslint-patch/modern-module-resolution");

module.exports = {
  extends: [
    "@knime/eslint-config/vue3-typescript",
    "@knime/eslint-config/typescript",
    "@knime/eslint-config/vitest",
  ],
  globals: {
    consola: false,
  },
  // TODO: fix issues inside vue3-pixi
  ignorePatterns: [
    "generated-api.ts",
    "generated-exceptions.ts",
    "vue3-pixi",
    "PageBuilder.umd.js",
  ],
  env: { browser: true, node: true },
  settings: {
    "import/resolver": {
      "eslint-import-resolver-custom-alias": {
        alias: {
          "@": "./src",
        },
      },
    },
  },
  rules: {
    "new-cap": ["warn", { capIsNewExceptionPattern: "^API\\.." }],
  },
};
