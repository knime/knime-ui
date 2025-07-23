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
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              // This import is restricted because for testing we
              // replace the api import with one that mocks all api functions automatically
              // but this requires a path alias import in order to work. See vitest.config.ts
              name: "@/api",
              message: 'Use "@api" instead of "@/api"',
            },
          ],
        },
      ],
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
