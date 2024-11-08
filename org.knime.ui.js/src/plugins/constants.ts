import * as colors from "@/style/colors";
import * as shapes from "@/style/shapes";
import * as zIndices from "@/style/z-indices";

import type { PluginInitFunction } from "./types";

const init: PluginInitFunction = ({ app }) => {
  app.config.globalProperties.$colors = colors;
  app.config.globalProperties.$shapes = shapes;
  app.config.globalProperties.$zIndices = zIndices;
};

export default init;
