import { fileURLToPath } from "url";

import { defineConfig } from "vitest/config";

import viteCfg from "./vite.config";

export default defineConfig((env) => {
  return {
    ...viteCfg(env),

    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
        "@api": fileURLToPath(new URL("./src/api/__mocks__", import.meta.url)),
      },
    },

    test: {
      include: ["**/__tests__/*.test.{js,mjs,cjs,ts,mts,cts}"],
      exclude: ["./node_modules/**/*"],
      setupFiles: ["src/test/setup"],
      environment: "jsdom",
      testTimeout: 30000,
      reporters: ["default", "junit"],

      coverage: {
        provider: "v8",
        all: true,
        reportsDirectory: "test-results",
        reporter: ["lcov"],
        exclude: [
          "test-results",
          "src/test",
          "target",
          "bin",
          "buildtools",
          ".history",
          "src/main.js",
          "src/router/index.js",
          "src/plugins/index.js",
          "src/plugins/constants.js",
          "src/store/index.js",
          "coverage/**",
          "dist/**",
          "**/*.d.ts",
          "**/__tests__/**",
          "**/{vite,vitest}.config.{js,cjs,mjs,ts}",
          "**/.{eslint,prettier,stylelint}rc.{js,cjs,yml}",
        ],
      },
      outputFile: {
        // needed for Bitbucket Pipeline
        // see https://support.atlassian.com/bitbucket-cloud/docs/test-reporting-in-pipelines/
        junit: "test-results/junit.xml",
      },
    },
  };
});
