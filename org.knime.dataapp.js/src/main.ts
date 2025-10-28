import * as Vue from "vue";
// eslint-disable-next-line depend/ban-dependencies
import { default as $axios } from "axios";
import { createPinia } from "pinia";
import "./assets/index.css";

import App from "./App.vue";
import { apiFactory } from "./api";
import initConstants from "./plugins/constants";
import { setupLogger } from "./plugins/logger";
import router from "./router";
import { createStore } from "./store";
import { embeddingBridge } from "./util/embedding/embeddingBridge";

setupLogger();

try {
  const app = Vue.createApp(App);

  const { jobId, restApiBaseUrl } = await embeddingBridge.waitForContext();

  const api = apiFactory({ $axios });
  const store = createStore(api);

  initConstants(app, { jobId, restApiBaseUrl });

  app.use(createPinia());
  app.use(router);
  app.use(store);

  // required for loading pagebuilder
  window.Vue = Vue;
  window.VUE_APP = app;

  app.mount("#app");
} catch (error) {
  consola.fatal("Failed to initialize DataApp UI");
  embeddingBridge.sendAppInitializationError(error);
}
