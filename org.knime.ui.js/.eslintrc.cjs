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
  ignorePatterns: ["generated-api.ts"],
  env: { browser: true, node: true },
  settings: {
    "import/resolver": {
      alias: {
        map: [["@", "./src"]],
      },
    },
  },
  overrides: [
    // TODO: turn this on again after fixing splitpanes import problems
    {
      files: ["**/SplitPanel.vue"],
      rules: {
        "import/extensions": ["off"],
      },
    },
  ],
  rules: {
    "new-cap": ["warn", { capIsNewExceptionPattern: "^API\\.." }],
  },
};
