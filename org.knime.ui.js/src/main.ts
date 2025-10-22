import { createApp } from "vue";
import { createPinia } from "pinia";

import { type EmbeddingContext, embeddingSDK } from "@knime/hub-features";
import { useLegacyMode } from "@knime/kds-components";

import { initJSONRPCClient } from "./api/json-rpc-client";
import KnimeUI from "./components/KnimeUI.vue";
import { setRestApiBaseUrl } from "./components/uiExtensions/common/useResourceLocation";
import {
  initGlobalEnvProperty,
  isBrowser,
  runInEnvironment,
} from "./environment";
import { initPlugins } from "./plugins";
import { setupLogger } from "./plugins/logger";
import { getToastsProvider } from "./plugins/toasts";
import { router } from "./router/router";

import "./assets/index.css";

// Setup logger for production
setupLogger();

const waitForEmbeddingContext = async (): Promise<EmbeddingContext> => {
  const isDevMode = import.meta.env.DEV;
  const isBrowserEmbeddedDevMode =
    import.meta.env.DEV &&
    import.meta.env.VITE_BROWSER_DEV_MODE_EMBEDDED === "true";

  const isE2EMode = import.meta.env.MODE === "e2e";

  // for dev mode, use provided url directly
  // see .env file for more details
  if (!isBrowserEmbeddedDevMode || isE2EMode) {
    // eslint-disable-next-line no-magic-numbers
    const twentyMinutes = 20 * 60 * 1000;

    const context: EmbeddingContext = {
      wsConnectionUri: import.meta.env.VITE_BROWSER_DEV_WS_URL,
      restApiBaseUrl: "_NOOP_",
      userIdleTimeout: twentyMinutes,
      jobId: "_NOOP_",
    };

    embeddingSDK.guest.setContext(context);
    return context;
  }

  if (isDevMode && isBrowserEmbeddedDevMode) {
    // still perform the message exchange for embedded mode
    // but use a local WS url for dev
    const context = await embeddingSDK.guest.waitForContext();

    return {
      ...context,
      wsConnectionUri: import.meta.env.VITE_BROWSER_DEV_WS_URL,
    } satisfies EmbeddingContext;
  }

  return embeddingSDK.guest.waitForContext();
};

// Set legacy mode class for KNIME Design System - should be done early to avoid flickering
useLegacyMode(true);

try {
  const toastServiceProvider = getToastsProvider();
  const toastPlugin = toastServiceProvider.getToastServicePlugin();

  await runInEnvironment({
    DESKTOP: async () => {
      await initJSONRPCClient("DESKTOP", null);
    },
    BROWSER: async () => {
      const embeddingContext = await waitForEmbeddingContext();
      await initJSONRPCClient("BROWSER", embeddingContext);
      setRestApiBaseUrl(embeddingContext.restApiBaseUrl);
    },
  });

  // Create Vue app
  const app = createApp(KnimeUI);

  // initialize pinia stores
  const pinia = createPinia();
  app.use(pinia);

  // use before other plugins so that $toast is available on the app instance
  app.use(toastPlugin);

  // Enable easier store debugging while on dev
  if (import.meta.env.DEV) {
    window.router = router;
    window.store = pinia;
    window.toast = toastServiceProvider;
    app.config.performance = true;
  }

  app.use(router);

  // Init plugins, provide store and router
  initPlugins({ app, router });
  initGlobalEnvProperty(app);

  app.mount("#app");
} catch (error) {
  consola.fatal("Failed to initialize Application", error);
  if (isBrowser()) {
    embeddingSDK.guest.sendEmbeddingFailureMessage(error);
  }
}
