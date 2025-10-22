import { URL, fileURLToPath } from "node:url";

import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";
import svgLoader from "vite-svg-loader";

import { svgoConfig } from "@knime/styles/config/svgo.config";

const envPrefix = "KNIME_";

export default defineConfig(({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd(), envPrefix) };

  return defineConfig({
    base: "./",
    plugins: [vue(), vueDevTools(), svgLoader({ svgoConfig })],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    envPrefix,
    server: {
      proxy: {
        "/_/api": {
          target: process.env.KNIME_DEV_LOCAL_EXECUTION_WEBAPP_URL,
          changeOrigin: true,
        },
      },
    },
  });
});
