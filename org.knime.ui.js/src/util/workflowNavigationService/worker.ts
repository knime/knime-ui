import { kdTree as KDTree } from "kd-tree-javascript";

import type { Workflow } from "@/api/custom-types";
import type { XY } from "@/api/gateway-api/generated-api";
import { isValidEvent, type EventTypes } from "./common";

const distance = function (pt1: XY, pt2: XY) {
  const { x: x1, y: y1 } = pt1;
  const { x: x2, y: y2 } = pt2;

  return Math.hypot(x2 - x1, y2 - y1);
};

const createTree = (data: Workflow) => {
  const points = Object.values(data.nodes).map(({ id, position }) => ({
    id,
    x: position.x,
    y: position.y,
  }));

  const tree = new KDTree<XY & { id?: string }>(points, distance, [
    "id",
    "x",
    "y",
  ]);

  return tree;
};

self.onmessage = function (event: {
  data: { type: EventTypes; payload: Workflow };
}) {
  if (!isValidEvent(event.data.type)) {
    postMessage("UNKNOWN MESSAGE TYPE");
  }

  // TODO: improve typing
  const messageHandler: Record<EventTypes, (data: any) => void> = {
    create: createTree,
    insert: () => {},
    nearest: (data) => {
      const tree = createTree(data.workflow);
      const nearestNodes = tree.nearest(data.position, 5);
      postMessage(nearestNodes);
    },
  };

  messageHandler[event.data.type](event.data.payload);
};
