import type { App } from "vue";
import type { Router } from "vue-router";

import type { ToastService } from "@knime/components";

import Portal from "@/components/common/Portal.vue";
import PortalTarget from "@/components/common/PortalTarget.vue";

import constants from "./constants";
import eventBus from "./event-bus";
import events from "./events";
import featureFlags from "./feature-flags";
import shortcuts from "./shortcuts";
import type { PluginInitFunction } from "./types";

export const initPlugins = ({
  app,
  router,
}: {
  app: App<Element>;
  router: Router;
}) => {
  const wrapPlugin = (plugin: PluginInitFunction) => ({
    install(app: App<Element>) {
      plugin({
        app,
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

  app.component("Portal", Portal); // eslint-disable-line vue/multi-word-component-names,vue/no-reserved-component-names
  app.component("PortalTarget", PortalTarget);
};
