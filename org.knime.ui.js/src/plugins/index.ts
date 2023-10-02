import type { App } from "vue";
import type { Store } from "vuex";
import type { Router } from "vue-router";

import Portal from "@/components/common/Portal.vue";
import PortalTarget from "@/components/common/PortalTarget.vue";
import type { RootStoreState } from "@/store/types";

import shortcuts from "./shortcuts";
import constants from "./constants";
import events from "./events";
import eventBus from "./event-bus";
import featureFlags from "./feature-flags";

export type PluginInitFunction = (payload: {
  app: App<Element>;
  $store: Store<RootStoreState>;
  $router: Router;
}) => void;

export const initPlugins = ({
  app,
  store,
  router,
}: {
  app: App<Element>;
  store: Store<any>;
  router: Router;
}) => {
  const wrapPlugin = (plugin: PluginInitFunction) => ({
    install(app) {
      plugin({ app, $store: store, $router: router });
    },
  });

  app.use(wrapPlugin(shortcuts));
  app.use(wrapPlugin(constants));
  app.use(wrapPlugin(events));
  app.use(wrapPlugin(eventBus));
  app.use(wrapPlugin(featureFlags));

  app.component("Portal", Portal);
  app.component("PortalTarget", PortalTarget);
};
