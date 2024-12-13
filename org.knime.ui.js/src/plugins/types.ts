import type { App } from "vue";
import type { Router } from "vue-router";
import type { Store } from "vuex";

import type { ToastService } from "@knime/components";

import type { SpaceItemChangedEvent } from "@/api/gateway-api/generated-api";
import type { RootStoreState } from "@/store/types";

export type PluginInitFunction = (payload: {
  app: App<Element>;
  $store: Store<RootStoreState>;
  $router: Router;
  $toast: ToastService;
}) => void;

export const isSpaceItemChangedEvent = (
  event: unknown,
): event is SpaceItemChangedEvent => {
  return (
    typeof event === "object" &&
    event !== null &&
    "providerId" in event &&
    "spaceId" in event &&
    "itemId" in event
  );
};
