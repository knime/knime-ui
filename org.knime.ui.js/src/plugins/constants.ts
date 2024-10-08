import * as colors from "@/style/colors";
import * as shapes from "@/style/shapes";

import type { PluginInitFunction } from "./types";

const init: PluginInitFunction = ({ app }) => {
  app.config.globalProperties.$colors = colors;
  app.config.globalProperties.$shapes = shapes;
};

export default init;
