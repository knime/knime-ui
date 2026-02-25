import { createShortcutsService } from "@/services/shortcuts/service";

import type { PluginInitFunction } from "./types";

// define plugin
const init: PluginInitFunction = ({ app, $router }) => {
  const $shortcuts = createShortcutsService({ $router });

  // define global $shortcuts property
  app.config.globalProperties.$shortcuts = $shortcuts;
};

export default init;
