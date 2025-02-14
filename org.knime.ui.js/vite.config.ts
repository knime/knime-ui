/* eslint-disable no-console */
import { URL, fileURLToPath } from "node:url";

import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import { ViteUserConfig } from "vitest/config";
import svgLoader from "vite-svg-loader";
import { isCustomElement } from "vue3-pixi";

// @ts-ignore
import { svgoConfig } from "@knime/styles/config/svgo.config";

export default defineConfig(({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };

  if (process.env.CANVAS_PERF_MODE) {
    console.log(" --- Custom build for performance test mode ---");
  }

  const config: ViteUserConfig = {
    plugins: [
      vue({
        template: {
          compilerOptions: { isCustomElement },
        },
      }),
      svgLoader({ svgoConfig }),
      // TODO: enable once it's compatible with the WebGL canvas
      // vueDevTools(),
    ],

    define: {
      "import.meta.env.CANVAS_PERF_MODE": process.env.CANVAS_PERF_MODE,
    },

    build: {
      outDir: process.env.CANVAS_PERF_MODE ? "./perf-tests/dist" : "./dist",
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
        "@api": fileURLToPath(new URL("./src/api", import.meta.url)),
      },
    },
  };

  return config;
});
