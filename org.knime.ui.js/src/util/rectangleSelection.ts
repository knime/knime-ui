import type { XY } from "@/api/gateway-api/generated-api";
import type { WorkflowState } from "@/store/workflow";
import * as $shapes from "@/style/shapes.mjs";

// find nodes that are fully or partly inside the rectangle defined by startPos and endPos
export const findItemsInsideOfRectangle = ({
  startPos,
  endPos,
  workflow,
}: {
  startPos: XY;
  endPos: XY;
  workflow: WorkflowState["activeWorkflow"];
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

  // divide bendpoints
  const bendpointsInside: `${string}__${string}`[] = [];
  const bendpointsOutside: `${string}__${string}`[] = [];
  Object.values(workflow.connections).forEach(({ bendpoints = [], id }) => {
    bendpoints.forEach(({ x, y }, index) => {
      // [left rectangle edge] left from [right node edge] && [right rectangle edge] right from [left node edge]
      const xInside = rectangle.x1 <= x && rectangle.x2 >= x;
      const yInside = rectangle.y1 <= y && rectangle.y2 >= y;

      // create lists with node ids
      if (xInside && yInside) {
        bendpointsInside.push(`${id}__${index}`);
      } else {
        bendpointsOutside.push(`${id}__${index}`);
      }
    });
  });

  return {
    nodesInside,
    nodesOutside,
    annotationsInside,
    annotationsOutside,
    bendpointsInside,
    bendpointsOutside,
  };
};
