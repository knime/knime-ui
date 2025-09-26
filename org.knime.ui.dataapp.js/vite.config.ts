import { URL, fileURLToPath } from "node:url";

import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";

const envPrefix = "KNIME_";

// https://vite.dev/config/
export default ({ mode }: { mode: string }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd(), envPrefix) };

  return defineConfig({
    base: "./",
    plugins: [vue(), vueDevTools()],
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
};
