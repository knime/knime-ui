import { createApp } from "vue";
import { gsap } from "gsap";
import { PixiPlugin } from "gsap/PixiPlugin";
import { createPinia } from "pinia";
import * as PIXI from "pixi.js";

import { setupHints } from "@knime/components";

import { setupPageBuilder } from "@/pageBuilderLoader.ts";

import { type ConnectionInfo, initJSONRPCClient } from "./api/json-rpc-client";
import KnimeUI from "./components/KnimeUI.vue";
import { setRestApiBaseUrl } from "./components/uiExtensions/common/useResourceLocation";
import {
  environment,
  initGlobalEnvProperty,
  isDesktop,
  runInEnvironment,
} from "./environment";
import { getHintConfiguration } from "./hints/hints.config";
import { initPlugins } from "./plugins";
import { setupLogger } from "./plugins/logger";
import { getToastsProvider } from "./plugins/toasts";
import { router } from "./router/router";

import "./assets/index.css";

gsap.registerPlugin(PixiPlugin);

PixiPlugin.registerPIXI(PIXI);

// Setup logger for production
setupLogger();

// Keep these in sync with the 'ap-loader' wrapper application, until the
const AWAITING_CONNECTION_INFO_MESSAGE = "KNIME_UI__AWAITING_CONNECTION_INFO";
const CONNECTION_INFO_MESSAGE = "KNIME_UI__CONNECTION_INFO";
const CONNECTION_FAIL_MESSAGE = "KNIME_UI__CONNECTION_FAIL";

const apiURLResolver = () =>
  new Promise<ConnectionInfo | null>((resolve, reject) => {
    // immediately resolve for desktop environment
    if (isDesktop) {
      resolve(null);
      return;
    }

    // for dev mode, use provided url directly
    // see .env file for more details
    if (
      import.meta.env.VITE_BROWSER_DEV_MODE === "true" &&
      import.meta.env.VITE_BROWSER_DEV_MODE_EMBEDDED !== "true"
    ) {
      // communicate "ready" state back to parent
      window.parent.postMessage(
        { type: AWAITING_CONNECTION_INFO_MESSAGE },
        "*",
      );

      resolve({
        url: import.meta.env.VITE_BROWSER_DEV_WS_URL,
        restApiBaseUrl: "",
        sessionId: "",
      });
      return;
    }

    // wait for wrapper app to send a message containing the api url
    window.addEventListener(
      "message",
      (event) => {
        if (event.data.type !== CONNECTION_INFO_MESSAGE) {
          return;
        }

        // for embedded dev mode, resolve to the dev urls
        // see .env file for more details
        if (import.meta.env.VITE_BROWSER_DEV_MODE_EMBEDDED === "true") {
          resolve({
            url: import.meta.env.VITE_BROWSER_DEV_WS_URL,
            restApiBaseUrl: "",
            sessionId: "",
          });
        }

        const { data } = event as MessageEvent<{
          type: string;
          payload: ConnectionInfo;
        }>;

        consola.info(
          "Browser mode init:: Received connection info message",
          data,
        );
        const { payload } = data;

        if (!payload.url || !payload.sessionId) {
          consola.fatal(
            "Browser mode init:: incorrect connection info payload",
            data,
          );
          reject(new Error("incorrect connection info payload"));
        }

        resolve(data.payload);
      },
      false,
    );

    // send message to parent after listener has been set-up
    consola.info("Browser mode init:: posting message to parent window");
    window.parent.postMessage({ type: AWAITING_CONNECTION_INFO_MESSAGE }, "*");
  });

try {
  const toastServiceProvider = getToastsProvider();
  const toastPlugin = toastServiceProvider.getToastServicePlugin();

  const connectionInfo = await apiURLResolver();

  // Create Vue app
  const app = createApp(KnimeUI);

  // initialize pinia stores
  const pinia = createPinia();
  app.use(pinia);

  // load and initialize the pageBuilder
  // This makes the pageBuilder available on the app instance
  await setupPageBuilder(app);

  // use before other plugins so that $toast is available on the app instance
  app.use(toastPlugin);

  await initJSONRPCClient(environment, connectionInfo);

  runInEnvironment({
    BROWSER: () => {
      setRestApiBaseUrl(connectionInfo!.restApiBaseUrl!);
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

  // Init plugins, provide store and router
  initPlugins({ app, router });
  initGlobalEnvProperty(app);

  // setup hints for desktop and use the url for videos unchanged
  runInEnvironment({
    DESKTOP: () => {
      setupHints({ hints: getHintConfiguration((url) => url) });
    },
  });

  app.mount("#app");
} catch (error) {
  consola.fatal("Failed to initialize Application", error);
  window.parent.postMessage({ type: CONNECTION_FAIL_MESSAGE, error }, "*");
}
