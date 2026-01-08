import { kdTree as KDTree } from "kd-tree-javascript";

import type { WorkflowObject } from "@/api/custom-types";
import type { XY } from "@/api/gateway-api/generated-api";

import {
  type FindNearestObjectPayload,
  type GenericWorkflowObject,
  type WorkerMessage,
  type WorkflowNavigationDirection,
} from "./types";
import { isValidEvent } from "./util";

const distance = function (pt1: XY, pt2: XY) {
  const { x: x1, y: y1 } = pt1;
  const { x: x2, y: y2 } = pt2;

  // use Manhattan distance instead of Euclidean distance
  return Math.abs(x2 - x1) + Math.abs(y2 - y1);
};

/**
 * Create the KDTree data structure to keep track of the point coordinates
 * of the objects in the workflow (nodes, annotations)
 * @param objects
 * @returns
 */
const createTree = (objects: WorkflowObject[]) => {
  return new KDTree<GenericWorkflowObject>(objects, distance, ["id", "x", "y"]);
};

/**
 * Apply a rotation to 2d plane around a point in a 45deg counterclockwise manner
 * @param originalPoint the point that will receive the rotation
 * @param center the point around which the rotation will happen
 * @returns the new coordinates of the point after the rotation
 */
const rotatePoint45deg = (originalPoint: XY, center: XY): XY => {
  const x0 = originalPoint.x;
  const y0 = originalPoint.y;
  const xc = center.x;
  const yc = center.y;
  // eslint-disable-next-line no-magic-numbers
  const angleInRadians: number = Math.PI / 4; // 45 degrees

  const x1 =
    (x0 - xc) * Math.cos(angleInRadians) -
    (y0 - yc) * Math.sin(angleInRadians) +
    xc;
  const y1 =
    (x0 - xc) * Math.sin(angleInRadians) +
    (y0 - yc) * Math.cos(angleInRadians) +
    yc;

  return { x: x1, y: y1 };
};

/**
 * Gets the displacement vector between 2 points
 * @param pointA
 * @param pointB
 * @returns
 */
const getDisplacementVector = (pointA: XY, pointB: XY): XY => ({
  x: pointA.x - pointB.x,
  y: pointA.y - pointB.y,
});

/**
 * Matches whether a given point is located in a given direction.
 *
 * Uses the sign (- / +) of the coordinates of the point (x, y)
 * to determine on which quadrant of the plane this point lies in. Assuming
 * a 45deg clockwise rotation has been applied to the plane that means all points
 * in it are rotated in a clockwise manner. Therefore, we can determine the
 * direction of the points (as vectors from the origin) based on the quadrant they
 * live in.
 *
 * To visualize this better, you can think of rotating the axes in a counterclockwise
 * manner (which is the same as rotating all points clockwise) and then use the following
 * example to see how the directions match the signs of the X,Y coordinates of the point
 *    -y        +x
 *     \   +-  /
 *      \     /
 *       \   /
 *   --    +     ++
 *       /   \
 *      /     \
 *     /   -+  \
 *   -x        +y
 * @param point
 * @param direction
 * @returns
 */
const isPointInDirection = (
  { x, y }: XY,
  direction: WorkflowNavigationDirection,
) => {
  const directionMatcher: Record<WorkflowNavigationDirection, boolean> = {
    top: x >= 0 && y < 0,
    left: x < 0 && y < 0,
    bottom: x < 0 && y >= 0,
    right: x >= 0 && y >= 0,
  };

  return directionMatcher[direction];
};

const findNearestNode = (data: FindNearestObjectPayload) => {
  const MAX_DISTANCE = 25;
  const tree = createTree(data.objects);
  const nearestNodes = tree.nearest(data.reference, MAX_DISTANCE);

  const nearest = nearestNodes
    // exclude self
    .filter(([node]) => node.id !== data.reference.id)
    .slice()
    // sort by distance
    .sort(([_1, d1], [_2, d2]) => (d1 < d2 ? -1 : 1))
    // add rotated points
    .map(([point]) => ({
      ...point,
      rotated: rotatePoint45deg(point, data.reference),
    }))
    // add displacement vector
    .map((point) => ({
      ...point,
      vector: getDisplacementVector(point.rotated, data.reference),
    }))
    .filter((point) => isPointInDirection(point.vector, data.direction))
    // grab the 1st node since it's the closest because they're sorted
    .at(0);

  postMessage(nearest);
};

self.onmessage = function (event: {
  data: WorkerMessage<FindNearestObjectPayload>;
}) {
  if (!isValidEvent(event.data?.type)) {
    postMessage("UNKNOWN MESSAGE EVENT");
    return;
  }

  findNearestNode(event.data.payload);
};
