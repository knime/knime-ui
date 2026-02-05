import { createApp } from "vue";
import { createPinia } from "pinia";

import { embeddingSDK } from "@knime/hub-features";
import { useKdsLegacyMode } from "@knime/kds-components";

import { setupAnalyticsService } from "./analytics";
import { initJSONRPCClient } from "./api/json-rpc-client";
import KnimeUI from "./components/KnimeUI.vue";
import {
  initGlobalEnvProperty,
  isBrowser,
  runInEnvironment,
} from "./environment";
import { waitForEmbeddingContext } from "./environment/waitForEmbeddingContext";
import { initPlugins } from "./plugins";
import { setupLogger } from "./plugins/logger";
import { getToastsProvider } from "./plugins/toasts";
import { router } from "./router/router";
import "./assets/index.css";
import { webResourceLocation } from "./webResourceLocation";

// Setup logger for production
setupLogger();

// Set legacy mode class for KNIME Design System - should be done early to avoid flickering
useKdsLegacyMode(true);

try {
  const toastServiceProvider = getToastsProvider();
  const toastPlugin = toastServiceProvider.getToastServicePlugin();

  // Create Vue app
  const app = createApp(KnimeUI);

  await runInEnvironment({
    DESKTOP: async () => {
      await initJSONRPCClient("DESKTOP", null);
    },
    BROWSER: async () => {
      const embeddingContext = await waitForEmbeddingContext();
      await initJSONRPCClient("BROWSER", embeddingContext);
      webResourceLocation.setContext({
        jobId: embeddingContext.jobId,
        restAPIBaseURL: embeddingContext.restApiBaseUrl,
      });

      if (embeddingContext.enableAnalytics) {
        setupAnalyticsService();
      }
    },
  });

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
