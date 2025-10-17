import * as Vue from "vue";
// eslint-disable-next-line depend/ban-dependencies
import { default as $axios } from "axios";
import { createPinia } from "pinia";
import "./assets/index.css";

import { embeddingSDK } from "@knime/hub-features";

import App from "./App.vue";
import { apiFactory } from "./api";
import initConstants from "./plugins/constants";
import { setupLogger } from "./plugins/logger";
import router from "./router";
import { createStore } from "./store";

setupLogger();

try {
  const app = Vue.createApp(App);

  const { jobId, restApiBaseUrl } = await embeddingSDK.guest.waitForContext();

  const api = apiFactory({ $axios });
  app.config.globalProperties.$api = api;
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
  embeddingSDK.guest.sendEmbeddingFailureMessage(error);
}
