import type { App } from "vue";
import type { Store } from "vuex";
import type { Router } from "vue-router";

import type { ToastService } from "@knime/components";

import Portal from "@/components/common/Portal.vue";
import PortalTarget from "@/components/common/PortalTarget.vue";
import type { RootStoreState } from "@/store/types";

import shortcuts from "./shortcuts";
import constants from "./constants";
import events from "./events";
import eventBus from "./event-bus";
import featureFlags from "./feature-flags";
import type { PluginInitFunction } from "./types";

export const initPlugins = ({
  app,
  store,
  router,
}: {
  app: App<Element>;
  store: Store<RootStoreState>;
  router: Router;
}) => {
  const wrapPlugin = (plugin: PluginInitFunction) => ({
    install(app: App<Element>) {
      plugin({
        app,
        $store: store,
        $router: router,
        $toast: app.config.globalProperties.$toast as ToastService,
      });
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
