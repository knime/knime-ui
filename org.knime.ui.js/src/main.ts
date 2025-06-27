import { createApp } from "vue";
import { createPinia } from "pinia";

import { initJSONRPCClient } from "./api/json-rpc-client";
import KnimeUI from "./components/KnimeUI.vue";
import { setRestApiBaseUrl } from "./components/uiExtensions/common/useResourceLocation";
import {
  initGlobalEnvProperty,
  isBrowser,
  runInEnvironment,
} from "./environment";
import { browserEmbedding } from "./environment/browserEmbedding";
import { initPlugins } from "./plugins";
import { setupLogger } from "./plugins/logger";
import { getToastsProvider } from "./plugins/toasts";
import { router } from "./router/router";

import "./assets/index.css";

// Setup logger for production
setupLogger();

try {
  const toastServiceProvider = getToastsProvider();
  const toastPlugin = toastServiceProvider.getToastServicePlugin();

  await runInEnvironment({
    DESKTOP: async () => {
      await initJSONRPCClient("DESKTOP", null);
    },
    BROWSER: async () => {
      const browserSessionContext = await browserEmbedding.waitForContext();
      await initJSONRPCClient("BROWSER", browserSessionContext);
      setRestApiBaseUrl(browserSessionContext.restApiBaseUrl);
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
    browserEmbedding.sendAppInitializationError(error);
  }
}
