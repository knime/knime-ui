import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import svgLoader from "vite-svg-loader";
import { configDefaults } from "vitest/config";
import vueDevTools from "vite-plugin-vue-devtools";
// @ts-ignore
import { svgoConfig } from "webapps-common/config/svgo.config";

export default defineConfig(({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };

  return {
    plugins: [vue(), svgLoader({ svgoConfig }), vueDevTools()],

    build: {
      target: "esnext",
    },

    server: {
      port: Number(process.env.VITE_APP_PORT) || 3000,
      watch: {
        ignored: ["**/test-results/**"],
      },

      proxy: {
        "/_/embed": {
          target: "http://localhost:8080",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/_\/embed/, ""),
        },
      },
    },

    base: "./",

    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
        "@api": fileURLToPath(new URL("./src/api", import.meta.url)),
      },
    },

    test: {
      include: ["**/__tests__/*.test.{js,mjs,cjs,ts,mts,cts}"],
      exclude: [
        ...configDefaults.exclude,
        "webapps-common",
        "knime-js-pagebuilder",
      ],
      setupFiles: ["src/test/setup"],
      environment: "jsdom",
      reporters: ["default", "junit"],
      alias: {
        "@api": fileURLToPath(
          new URL("./src/api/__mocks__/index.ts", import.meta.url),
        ),
      },
      coverage: {
        all: true,
        reportsDirectory: "test-results",
        reporter: "lcov",
        exclude: [
          "test-results",
          "src/test",
          "target",
          "bin",
          "webapps-common",
          "knime-js-pagebuilder",
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
