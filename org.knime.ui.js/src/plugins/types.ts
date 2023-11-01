import type { App } from "vue";
import type { Router } from "vue-router";
import type { Store } from "vuex";

import type { ToastService } from "webapps-common/ui/services/toast";
import type { RootStoreState } from "@/store/types";

export type PluginInitFunction = (payload: {
  app: App<Element>;
  $store: Store<RootStoreState>;
  $router: Router;
  $toast: ToastService;
}) => void;
