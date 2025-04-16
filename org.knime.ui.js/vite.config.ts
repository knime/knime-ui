import { URL, fileURLToPath } from "node:url";

import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import { ViteUserConfig } from "vitest/config";
import sbom from "rollup-plugin-sbom";
import svgLoader from "vite-svg-loader";

import { svgoConfig } from "@knime/styles/config/svgo.config";

// TODO: replace with app.component calls
import { isCustomElement } from "./src/vue3-pixi/index";

// @ts-expect-error (please add error description)

export default defineConfig(({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };

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
      sbom({
        outFormats: ["json"],
        outDir: "sbom",
        includeWellKnown: false,
        generateSerial: true,
      }),
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
