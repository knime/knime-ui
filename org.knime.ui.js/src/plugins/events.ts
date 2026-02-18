import { initializeEventHandlers } from "@/api/events/event-handlers";

import type { PluginInitFunction } from "./types";

const init: PluginInitFunction = ({ $router, $toast }) => {
  initializeEventHandlers($router, $toast);
};

export default init;
