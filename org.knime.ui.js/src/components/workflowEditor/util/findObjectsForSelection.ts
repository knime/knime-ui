import type { Workflow } from "@/api/custom-types";
import type { XY } from "@/api/gateway-api/generated-api";
import * as $shapes from "@/style/shapes";

import { canvasRendererUtils } from "./canvasRenderer";

// find objects that are fully or partly inside the rectangle defined by startPos and endPos
export const findObjectsForSelection = ({
  startPos,
  endPos,
  workflow,
}: {
  startPos: XY;
  endPos: XY;
  workflow: Workflow;
}) => {
  // normalize rectangle
  const rectangle = {
    x1: Math.min(startPos.x, endPos.x), // x left
    y1: Math.min(startPos.y, endPos.y), // y top
    x2: Math.max(startPos.x, endPos.x), // x right
    y2: Math.max(startPos.y, endPos.y), // y bottom
  };

  // divide nodes
  const nodesInside: string[] = [];
  const nodesOutside: string[] = [];
  Object.values(workflow.nodes).forEach(({ position, id }) => {
    const { nodeSize } = $shapes;

    // [left rectangle edge] left from [right node edge] && [right rectangle edge] right from [left node edge]
    const xInside =
      rectangle.x1 <= position.x + nodeSize && rectangle.x2 >= position.x;
    const yInside =
      rectangle.y1 <= position.y + nodeSize && rectangle.y2 >= position.y;

    // create lists with node ids
    if (xInside && yInside) {
      nodesInside.push(id);
    } else {
      nodesOutside.push(id);
    }
  });

  // divide annotations
  const annotationsInside: string[] = [];
  const annotationsOutside: string[] = [];
  Object.values(workflow.workflowAnnotations).forEach(({ bounds, id }) => {
    const annotationX1 = bounds.x; // x left
    const annotationX2 = bounds.x + bounds.width; // x right
    const annotationY1 = bounds.y; // y top
    const annotationY2 = bounds.y + bounds.height; // y bottom

    const startedFromInside =
      annotationX1 <= rectangle.x1 &&
      annotationX2 >= rectangle.x2 &&
      annotationY1 <= rectangle.y1 &&
      annotationY2 >= rectangle.y2;
    const xInside =
      rectangle.x1 <= annotationX2 && rectangle.x2 >= annotationX1;
    const yInside =
      rectangle.y1 <= annotationY2 && rectangle.y2 >= annotationY1;

    // create lists with annotation ids
    if (xInside && yInside && !startedFromInside) {
      annotationsInside.push(id);
    } else {
      annotationsOutside.push(id);
    }
  });

  return {
    nodesInside,
    nodesOutside,
    annotationsInside,
    annotationsOutside,
  };
};

// find objects that are fully or partly inside the rectangle defined by startPos and endPos
export const findObjectsForSelectionWebGL = ({
  startPos,
  endPos,
  workflow,
}: {
  startPos: XY;
  endPos: XY;
  workflow: Workflow;
}) => {
  if (!canvasRendererUtils.isWebGLRenderer()) {
    throw new Error("This function is only compatible with WebGL canvas");
  }

  // normalize rectangle
  const rectangle = {
    x1: Math.min(startPos.x, endPos.x), // x left
    y1: Math.min(startPos.y, endPos.y), // y top
    x2: Math.max(startPos.x, endPos.x), // x right
    y2: Math.max(startPos.y, endPos.y), // y bottom
  };

  const inside = new Map<string, { id: string; type: "node" | "annotation" }>();
  const outside = new Map<
    string,
    { id: string; type: "node" | "annotation" }
  >();

  for (const { id, position } of Object.values(workflow.nodes)) {
    const { nodeSize } = $shapes;

    // [left rectangle edge] left from [right node edge] && [right rectangle edge] right from [left node edge]
    const xInside =
      rectangle.x1 <= position.x + nodeSize && rectangle.x2 >= position.x;
    const yInside =
      rectangle.y1 <= position.y + nodeSize && rectangle.y2 >= position.y;

    // create lists with node ids
    if (xInside && yInside) {
      inside.set(id, { id, type: "node" });
    } else {
      outside.set(id, { id, type: "node" });
    }
  }

  for (const { id, bounds } of workflow.workflowAnnotations) {
    const annotationX1 = bounds.x; // x left
    const annotationX2 = bounds.x + bounds.width; // x right
    const annotationY1 = bounds.y; // y top
    const annotationY2 = bounds.y + bounds.height; // y bottom

    const isCoveringComplete =
      rectangle.x1 < annotationX1 &&
      rectangle.y1 < annotationY1 &&
      rectangle.x2 > annotationX2 &&
      rectangle.y2 > annotationY2;

    if (isCoveringComplete) {
      inside.set(id, { id, type: "annotation" });
    } else {
      outside.set(id, { id, type: "annotation" });
    }
  }

  return {
    inside,
    outside,
  };
};
