import * as colors from "@/style/colors";
import * as shapes from "@/style/shapes";
import * as zIndices from "@/style/z-indices";

import type { PluginInitFunction } from "./types";

export const characterLimits = Object.freeze({
  workflowAnnotations: 50_000,
  nodeLabel: 1000,
  nodeName: 200,
  metadata: {
    description: 50_000,
    tags: 100,
    url: {
      text: 200,
      href: 2048,
    },
    component: {
      portName: 100,
      portDescription: 500,
    },
  },
  kai: 300,
  searchFields: 300,
});

const init: PluginInitFunction = ({ app }) => {
  app.config.globalProperties.$colors = colors;
  app.config.globalProperties.$shapes = shapes;
  app.config.globalProperties.$zIndices = zIndices;
  app.config.globalProperties.$characterLimits = characterLimits;
};

export default init;
