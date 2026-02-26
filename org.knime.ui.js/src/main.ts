import { createApp } from "vue";
import { createPinia } from "pinia";

import { embeddingSDK } from "@knime/hub-features";
import { useKdsLegacyMode } from "@knime/kds-components";

import {
  initBrowserRPCClient,
  initDesktopRPCClient,
} from "./api/json-rpc-client";
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
import { setupAnalyticsService } from "./services/analytics";
import "./assets/index.css";
import { registerAPIEventHandlers } from "./services/apiEventHandler";
import { sessionHandler } from "./services/sessionHandler";
import { webResourceLocation } from "./services/webResourceLocation";

// Setup logger for production
setupLogger();

// Set legacy mode class for KNIME Design System - should be done early to avoid flickering
useKdsLegacyMode(true);

try {
  const toastServiceProvider = getToastsProvider();
  const toastPlugin = toastServiceProvider.getToastServicePlugin();

  // Create Vue app
  const app = createApp(KnimeUI);

  // initialize pinia stores
  const pinia = createPinia();
  app.use(pinia);

  // use before other plugins so that $toast is available on the app instance
  app.use(toastPlugin);

  await runInEnvironment({
    DESKTOP: () => {
      initDesktopRPCClient();
      return Promise.resolve();
    },
    BROWSER: async () => {
      const embeddingContext = await waitForEmbeddingContext();
      const { ws } = initBrowserRPCClient(embeddingContext);

      webResourceLocation.setContext({
        jobId: embeddingContext.jobId,
        restAPIBaseURL: embeddingContext.restApiBaseUrl,
      });

      if (embeddingContext.enableAnalytics) {
        setupAnalyticsService({ jobId: embeddingContext.jobId });
      }

      sessionHandler.init(ws);
    },
  });

  // Enable easier store debugging while on dev
  if (import.meta.env.DEV) {
    window.router = router;
    window.store = pinia;
    window.toast = toastServiceProvider;
    app.config.performance = true;
  }

  app.use(router);

  registerAPIEventHandlers(router, toastServiceProvider);

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
