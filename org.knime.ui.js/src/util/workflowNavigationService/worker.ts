import { kdTree as KDTree } from "kd-tree-javascript";

import type { Workflow } from "@/api/custom-types";
import type { XY } from "@/api/gateway-api/generated-api";
import {
  isValidEvent,
  type Direction,
  type WorkerMessage,
  type FindNearestObjectPayload,
  type GenericWorkflowObject,
} from "./common";

const distance = function (pt1: XY, pt2: XY) {
  const { x: x1, y: y1 } = pt1;
  const { x: x2, y: y2 } = pt2;

  return Math.hypot(x2 - x1, y2 - y1);
};

/**
 * Create the KDTree data structure to keep track of the point coordinates
 * of the objects in the workflow (nodes, annotations)
 * @param data
 * @returns
 */
const createTree = (data: Workflow) => {
  const nodePoints = Object.values(data.nodes).map(({ id, position }) => ({
    id,
    type: "node" as const,
    x: position.x,
    y: position.y,
  }));

  const annotationPoints = data.workflowAnnotations.map(({ id, bounds }) => ({
    id,
    type: "annotation" as const,
    x: bounds.x,
    y: bounds.y,
  }));

  return new KDTree<GenericWorkflowObject>(
    [...nodePoints, ...annotationPoints],
    distance,
    ["id", "x", "y"],
  );
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
 * to determine on which quadrant of the plane this point lies in. Then, assuming
 * a 45deg counterclockwise rotation of said plane has been applied it will determine
 * whether the point matches the direction. As an example, see the following
 * rotated coordinates and see how the signs correspond to the quadrants of the plane
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
const isPointInDirection = ({ x, y }: XY, direction: Direction) => {
  const directionMatcher: Record<Direction, boolean> = {
    top: x >= 0 && y < 0,
    left: x < 0 && y < 0,
    bottom: x < 0 && y >= 0,
    right: x >= 0 && y >= 0,
  };

  return directionMatcher[direction];
};

const findNearestNode = (data: FindNearestObjectPayload) => {
  const MAX_DISTANCE = 15;
  const tree = createTree(data.workflow);
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
