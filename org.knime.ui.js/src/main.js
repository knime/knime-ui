import * as Vue from "vue";
import KnimeUI from "./components/KnimeUI.vue";

import { initJsonRpcClient } from "./api/json-rpc-client";
import { silentLogger } from "./plugins/logger";
import { initStore } from "./store";
import { router } from "./router";
import { initPlugins } from "./plugins";

import "./assets/index.css";

import PageBuilder from "pagebuilder/src/components/PageBuilder.vue";

// Setup logger for production
silentLogger();

// required for dynamically loaded components which will access the Vue instance off of the window object
// e.g: TableView, NodeDialog
window.Vue = Vue;

initJsonRpcClient();

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

app.use(store);
app.use(router);
app.mount("#app");
