import { URL, fileURLToPath } from "node:url";

import { ProxyOptions, defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import { ViteUserConfig } from "vitest/config";
import sbom from "rollup-plugin-sbom";
import svgLoader from "vite-svg-loader";
import { compilerOptions } from "vue3-pixi";

// @ts-expect-error (please add error description)
import { svgoConfig } from "@knime/styles/config/svgo.config";

import { pagebuilderProxyVitePlugin } from "./pagebuilder-proxy-vite-plugin.js";
// TODO: replace with app.component calls

export default defineConfig(({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };

  const canSetupDevProxy =
    process.env.VITE_HUB_AUTH_USER &&
    process.env.VITE_HUB_AUTH_PASS &&
    process.env.VITE_HUB_API_URL;

  const devServerHubApiProxy = canSetupDevProxy
    ? ({
        "/_/api": {
          target: process.env.VITE_HUB_API_URL,
          changeOrigin: true,
          auth: `${process.env.VITE_HUB_AUTH_USER}:${process.env.VITE_HUB_AUTH_PASS}`,
          rewrite: (path) => path.replace(/^\/_\/api/, ""),
        },
      } satisfies Record<string, ProxyOptions>)
    : // eslint-disable-next-line no-undefined
      undefined;

  const config: ViteUserConfig = {
    plugins: [
      vue({
        template: {
          compilerOptions,
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
      mode === "development" &&
        process.env.VITE_USE_LOCAL_PAGEBUILDER === "true" &&
        pagebuilderProxyVitePlugin(
          process.env.VITE_LOCAL_PAGEBUILDER_RELATIVE_PATH,
        ),
    ].filter(Boolean),

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
      proxy: devServerHubApiProxy,
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
