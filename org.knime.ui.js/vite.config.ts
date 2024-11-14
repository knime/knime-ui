import { URL, fileURLToPath } from "node:url";

import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import { ViteUserConfig } from "vitest/config";
import vueDevTools from "vite-plugin-vue-devtools";
import svgLoader from "vite-svg-loader";

// @ts-ignore
import { svgoConfig } from "@knime/styles/config/svgo.config";

export default defineConfig(({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };

  const config: ViteUserConfig = {
    plugins: [vue(), svgLoader({ svgoConfig }), vueDevTools()],

    build: {
      target: "esnext",
    },

    // TODO: remove this when we have builds fo that libs, without them the optimizer can break things
    optimizeDeps: {
      exclude: [
        "@knime/components",
        "@knime/rich-text-editor",
        "@knime/utils",
        "@knime/virtual-tree",
      ],
    },

    server: {
      port: Number(process.env.VITE_APP_PORT) || 3000,
      watch: {
        ignored: ["**/test-results/**"],
      },
    },

    base: "./",

    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },

    test: {
      include: ["**/__tests__/*.test.{js,mjs,cjs,ts,mts,cts}"],
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

  return config;
});
