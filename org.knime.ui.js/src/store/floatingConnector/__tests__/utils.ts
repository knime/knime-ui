import { ref } from "vue";

import type { KnimeNode } from "@/api/custom-types";
import type { FloatingConnector } from "../types";

export const createMockFloatingConnector = (
  node: KnimeNode,
  portIndex: number,
) => {
  return ref<FloatingConnector>({
    id: "mock-drag-connector",
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
      portPosition: { x: 10, y: 10 },
    },
  });
};
