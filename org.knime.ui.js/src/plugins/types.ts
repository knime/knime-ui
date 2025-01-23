import type { App } from "vue";
import type { Router } from "vue-router";

import type { ToastService } from "@knime/components";

export type PluginInitFunction = (payload: {
  app: App<Element>;
  $router: Router;
  $toast: ToastService;
}) => void;
