import * as Vue from "vue";
import KnimeUI from "./components/KnimeUI.vue";

import { initJSONRPCClient } from "./api/json-rpc-client";
import { setupLogger } from "./plugins/logger";
import { initStore } from "./store";
import { router } from "./router";
import { initPlugins } from "./plugins";
import { environment, initGlobalEnvProperty } from "./environment";

import "./assets/index.css";

import PageBuilder from "pagebuilder/src/components/PageBuilder.vue";

// Setup logger for production
setupLogger();

// required for dynamically loaded components which will access the Vue instance off of the window object
// e.g: TableView, NodeDialog
window.Vue = Vue;

try {
  await initJSONRPCClient(environment);

  // Create Vue app
  const app = Vue.createApp(KnimeUI);

  // Provide store and init plugins
  const store = initStore();

  PageBuilder.initStore(store);

  // Enable easier store debugging while on dev
  if (import.meta.env.DEV) {
    window.store = store;
    window.router = router;
  }

  initPlugins({ app, store, router });
  initGlobalEnvProperty(app);

  app.use(store);
  app.use(router);
  app.mount("#app");
} catch (error) {
  consola.log("Could not initialize Application due to:", error);
}
