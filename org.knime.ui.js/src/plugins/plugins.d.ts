import { RouteLocation, Router } from "vue-router";

import type { ToastService } from "@knime/components";

import { knimeExternalUrls } from "@/plugins/knimeExternalUrls";
import type { ShortcutsService } from "@/shortcuts/types";
import * as colors from "@/style/colors";
import * as shapes from "@/style/shapes";
import * as zIndices from "@/style/z-indices";

import type { EventBus } from "./event-bus";
import type { Features } from "./feature-flags";

interface _ComponentCustomProperties {
  $bus: EventBus;
  $shapes: typeof shapes;
  $colors: typeof colors;
  $knimeExternalUrls: typeof knimeExternalUrls;
  $zIndices: typeof zIndices;
  $features: Features;
  $shortcuts: ShortcutsService;
  $router: Router;
  $route: RouteLocation;
  $toast: ToastService;
}

declare module "vue" {
  interface ComponentCustomProperties extends _ComponentCustomProperties {}
}

export {};
