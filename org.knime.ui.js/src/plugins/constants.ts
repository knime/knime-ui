import * as colors from "@/style/colors.mjs";
import * as shapes from "@/style/shapes.mjs";
import type { PluginInitFunction } from "./types";

const init: PluginInitFunction = ({ app }) => {
  app.config.globalProperties.$colors = colors;
  app.config.globalProperties.$shapes = shapes;
};

export default init;
