import globals from "globals";

import knimeVitestConfig from "@knime/eslint-config/vitest.js";
import knimeVue3TSConfig from "@knime/eslint-config/vue3-typescript.js";

export default [
  ...knimeVue3TSConfig,
  ...knimeVitestConfig,
  {
    ignores: [
      "**/generated-api.ts",
      "**/generated-exceptions.ts",
      "playwright-report",
      "**/vue3-pixi", // TODO: fix issues inside vue3-pixi
    ],
  },
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        consola: true,
      },
    },
    rules: {
      "new-cap": ["warn", { capIsNewExceptionPattern: "^API\\.." }],
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
  // TODO move this to @knime/eslint-config
  {
    files: [...knimeVitestConfig[0].files, "src/test/**", "**/__tests__/**"],
    rules: {
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-check": false,
          "ts-expect-error": false,
          "ts-ignore": true,
          "ts-nocheck": true,
        },
      ],
    },
  },
];
