import globals from "globals";

// @ts-expect-error
import knimeVitestConfig from "@knime/eslint-config/vitest.js";
// @ts-expect-error
import knimeVue3TSConfig from "@knime/eslint-config/vue3-typescript.js";

export default [
  ...knimeVue3TSConfig(),
  ...knimeVitestConfig,
  {
    ignores: ["**/generated-api.ts", "**/generated-exceptions.ts"],
  },
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        consola: true,
      },
    },
    settings: {
      "import-x/resolver": {
        "eslint-import-resolver-custom-alias": {
          alias: {
            "@": "./src",
          },
        },
      },
    },
  },
];
