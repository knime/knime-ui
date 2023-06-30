import { Store } from "vuex";
import { RouteLocation, Router } from "vue-router";

import type { ShortcutsService } from "@/shortcuts/types";
import * as colors from "@/style/colors.mjs";
import * as shapes from "@/style/shapes.mjs";
import type { EventBus } from "./event-bus";
import type { Features } from "./feature-flags";
import { RootStoreState } from "@/store/types";

declare module "vue" {
  interface ComponentCustomProperties {
    $bus: EventBus;
    $shapes: typeof shapes;
    $colors: typeof colors;
    $features: Features;
    $shortcuts: ShortcutsService;
    $store: Store<RootStoreState>;
    $router: Router;
    $route: RouteLocation;
  }
}

export {};
