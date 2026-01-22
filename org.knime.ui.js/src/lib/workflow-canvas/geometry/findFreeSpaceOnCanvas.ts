import type { KnimeNode } from "@/api/custom-types";
import type { XY } from "@/api/gateway-api/generated-api";
import { geometry } from "@/lib/geometry";
import type { GeometryArea, GeometryBounds } from "@/lib/geometry";
import { nodeSize } from "@/style/shapes";

export const CONSTANTS = {
  NODE_PADDING: 50,
  VISIBILITY_THRESHOLD: 0.7,
};

type findFreeSpaceOptions = {
  area: GeometryArea;
  workflow: { nodes: Record<string, KnimeNode> };
  startPosition: XY;
  step: XY;
};

/**
 * Simple and inefficient algorithm to find free space on the workflow canvas,
 * based on the rectangular area around workflow objects
 *
 * Currently only works for nodes on the workflow
 * @param area the area to be fit in
 * @param workflow object including nodes
 * @param startPosition position from where to start fitting the area
 * @param step shift area by this step before trying again
 * @returns x and y, for where the area fits on the workflow
 */
export const findFreeSpace = ({
  area,
  workflow: { nodes },
  startPosition = { x: 0, y: 0 },
  step,
}: findFreeSpaceOptions) => {
  const estimatedNodeBounds = (node: KnimeNode): GeometryBounds => ({
    top: node.position.y - CONSTANTS.NODE_PADDING,
    left: node.position.x - CONSTANTS.NODE_PADDING,
    width: nodeSize + CONSTANTS.NODE_PADDING + CONSTANTS.NODE_PADDING,
    height: nodeSize + CONSTANTS.NODE_PADDING + CONSTANTS.NODE_PADDING,
  });

  // draw a spacious rectangle around every node
  const nodeBounds = Object.values(nodes).map(estimatedNodeBounds);

  // shift the area to the start position
  const currentBounds: GeometryBounds = {
    top: startPosition.y,
    left: startPosition.x,
    width: area.width,
    height: area.height,
  };

  let overlap: number;
  do {
    // check how much the area at the current position overlaps with workflow objects
    overlap = 0;
    nodeBounds.forEach((nodeArea) => {
      overlap += geometry.areaCoverage(currentBounds, nodeArea);
    });

    // if it doesn't overlap at all, take this position
    if (overlap === 0) {
      return {
        x: currentBounds.left,
        y: currentBounds.top,
      };
    }

    // otherwise shift the area by [step] and repeat
    currentBounds.left += step.x;
    currentBounds.top += step.y;

    // the loop will terminate, because the workflow is theoretically limitless
    // eslint-disable-next-line no-constant-condition
  } while (true);
};

type FindFreeSpaceFromOptions = {
  objectBounds: GeometryArea;
  nodes: Record<string, KnimeNode>;
  visibleFrame: GeometryBounds;
};

/**
 * find free space for objects (e.g. clipboard)
 *
 * @param objectBounds
 * @param nodes all nodes of the workflow
 * @param visibleFrame
 *
 * @returns free space position and visibility of the area, if pasted there
 */
export const findFreeSpaceFrom =
  ({ objectBounds, nodes, visibleFrame }: FindFreeSpaceFromOptions) =>
  ({ left, top }: { left: number; top: number }) => {
    const position = findFreeSpace({
      area: objectBounds,
      workflow: { nodes },
      startPosition: {
        x: left,
        y: top,
      },
      step: {
        x: 120,
        y: 120,
      },
    });

    const visibility = geometry.areaCoverage(
      {
        left: position.x,
        top: position.y,
        width: objectBounds.width,
        height: objectBounds.height,
      },
      visibleFrame,
    );

    return {
      ...position,
      visibility,
    };
  };

type findFreeSpaceAroundPointWithFallbackOptions = Omit<
  FindFreeSpaceFromOptions,
  "objectBounds"
> & {
  objectBounds?: GeometryArea;
  startPoint: XY;
};

export const findFreeSpaceAroundPointWithFallback = ({
  startPoint: { x, y },
  visibleFrame,
  objectBounds = { width: nodeSize, height: nodeSize },
  nodes,
}: findFreeSpaceAroundPointWithFallbackOptions) => {
  let offsetX = 0;
  do {
    const fromCenter = findFreeSpaceFrom({ visibleFrame, objectBounds, nodes })(
      {
        left: x + offsetX,
        top: y,
      },
    );

    if (fromCenter.visibility >= CONSTANTS.VISIBILITY_THRESHOLD) {
      consola.info("found free space around center");
      const { x, y } = fromCenter;
      return { x, y };
    }

    // eslint-disable-next-line no-magic-numbers
    offsetX += 120;
  } while (offsetX < (visibleFrame?.right ?? -Infinity));

  consola.info("no free space found around center");
  return {
    x: x + Math.random() * objectBounds.width,
    y: y + Math.random() * objectBounds.height,
  };
};

type findFreeSpaceAroundCenterWithFallbackOptions = Omit<
  FindFreeSpaceFromOptions,
  "objectBounds"
> & {
  objectBounds?: GeometryArea;
};

/**
 * Finds free space to paste or insert a node.
 *
 * @param visibleFrame - visible frame look in canvas store
 * @param objectBounds - size of the object, defaults to nodeSize
 * @param nodes
 *
 * @returns position with free space
 */
export const findFreeSpaceAroundCenterWithFallback = ({
  visibleFrame,
  objectBounds = { width: nodeSize, height: nodeSize },
  nodes,
}: findFreeSpaceAroundCenterWithFallbackOptions): XY => {
  const startPoint = geometry.getCenteredPositionInVisibleFrame(
    visibleFrame,
    objectBounds,
  );
  return findFreeSpaceAroundPointWithFallback({
    startPoint,
    visibleFrame,
    objectBounds,
    nodes,
  });
};
