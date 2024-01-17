import * as Vue from "vue";
import KnimeUI from "./components/KnimeUI.vue";

import { initJSONRPCClient, type ConnectionInfo } from "./api/json-rpc-client";
import { setupLogger } from "./plugins/logger";
import { initStore } from "./store";
import { router } from "./router";
import { initPlugins } from "./plugins";
import {
  environment,
  initGlobalEnvProperty,
  isDesktop,
  runInEnvironment,
} from "./environment";

import "./assets/index.css";

import PageBuilder from "pagebuilder/src/components/PageBuilder.vue";
import { getToastsProvider } from "./plugins/toasts";

// Setup logger for production
setupLogger();

// required for dynamically loaded components which will access the Vue instance off of the window object
// e.g: TableView, NodeDialog
window.Vue = Vue;

// Keep these in sync with the 'ap-loader' wrapper application, until the
const AWAITING_CONNECTION_INFO_MESSAGE = "KNIME_UI__AWAITING_CONNECTION_INFO";
const CONNECTION_INFO_MESSAGE = "KNIME_UI__CONNECTION_INFO";
const CONNECTION_FAIL_MESSAGE = "KNIME_UI__CONNECTION_FAIL";

const isValidOrigin = (origin: string) => {
  if (import.meta.env.DEV) {
    return true;
  }

  return origin.includes("knime.com");
};

const apiURLResolver = () =>
  new Promise<ConnectionInfo | null>((resolve, reject) => {
    // immediately resolve for desktop environment
    if (isDesktop) {
      resolve(null);
      return;
    }

    // for dev mode, use provided url directly
    if (import.meta.env.VITE_BROWSER_DEV_MODE) {
      resolve({
        url: import.meta.env.VITE_BROWSER_DEV_WS_URL,
        restApiBaseUrl: import.meta.env.VITE_BROWSER_DEV_REST_API_BASE_URL,
        jobId: "",
        sessionId: "",
      });
      return;
    }

    // wait for wrapper app to send a message containing the api url
    window.addEventListener(
      "message",
      (event) => {
        if (!isValidOrigin(event.origin)) {
          consola.error(`invalid origin received: ${event.origin}`);
          return;
        }

        if (event.data.type !== CONNECTION_INFO_MESSAGE) {
          return;
        }

        const { data } = event as MessageEvent<{
          type: string;
          payload: ConnectionInfo;
        }>;

        consola.log("received connection info message", data);
        const { payload } = data;

        if (!payload.url || !payload.jobId || !payload.sessionId) {
          consola.error("incorrect connection info payload", data);
          reject(new Error("incorrect connection info payload"));
        }

        resolve(data.payload);
      },
      false,
    );

    // send message to parent after listener has been set-up
    consola.log("posting message to parent window");
    window.parent.postMessage({ type: AWAITING_CONNECTION_INFO_MESSAGE }, "*");
  });

try {
  const store = initStore();

  const toastServiceProvider = getToastsProvider();
  const toastPlugin = toastServiceProvider.getToastServicePlugin();

  const connectionInfo = await apiURLResolver();

  await initJSONRPCClient(environment, connectionInfo, store);

  // Create Vue app
  const app = Vue.createApp(KnimeUI);

  // use before other plugins so that $toast is available on the app instance
  app.use(toastPlugin);

  runInEnvironment({
    BROWSER: () => {
      store.commit("api/setRestApiBaseUrl", connectionInfo.restApiBaseUrl);
    },
  });

  PageBuilder.initStore(store);

  // Enable easier store debugging while on dev
  if (import.meta.env.DEV) {
    window.store = store;
    window.router = router;
  }

  // Init plugins, provide store and router
  initPlugins({ app, store, router });
  initGlobalEnvProperty(app);

  app.use(store);
  app.use(router);

  app.mount("#app");
} catch (error) {
  consola.log("Could not initialize Application due to:", error);
  window.parent.postMessage({ type: CONNECTION_FAIL_MESSAGE, error }, "*");
}
