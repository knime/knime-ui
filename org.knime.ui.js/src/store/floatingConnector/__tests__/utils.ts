import { ref } from "vue";

import type { KnimeNode } from "@/api/custom-types";
import type { FullFloatingConnector } from "../types";

export const createMockFloatingConnector = (
  node: KnimeNode,
  portIndex: number,
) => {
  return ref<FullFloatingConnector>({
    id: "full-floating-connector",
    absolutePoint: { x: 0, y: 0 },
    allowedActions: {
      canDelete: false,
    },
    flowVariableConnection: false,
    sourceNode: node.id,
    sourcePort: portIndex,
    context: {
      origin: "out",
      parentNodeId: node.id,
      portInstance: node.outPorts[portIndex],
    },
  });
};
