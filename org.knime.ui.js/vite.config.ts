import { URL, fileURLToPath } from "node:url";

import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import { UserConfig } from "vitest/config";
import vueDevTools from "vite-plugin-vue-devtools";
import svgLoader from "vite-svg-loader";
import { isCustomElement, transformAssetUrls } from "vue3-pixi";

// @ts-ignore
import { svgoConfig } from "@knime/styles/config/svgo.config";

export default defineConfig(({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };

  const config: UserConfig = {
    plugins: [
      vue({
        template: {
          // support for custom elements and remove the unknown element warnings
          compilerOptions: { isCustomElement },
          // support for asset url conversion
          transformAssetUrls,
        },
      }),
      svgLoader({ svgoConfig }),
      vueDevTools(),
    ],

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
        "@api": fileURLToPath(new URL("./src/api", import.meta.url)),
      },
    },
  };

  return config;
});
