import type { Bounds, XY } from "@/api/gateway-api/generated-api";

import type { GeometryArea, GeometryBounds, GeometryEdge } from "./types";

/**
 * Finds the intersection of A and B
 * @param A area A
 * @param B area B
 *
 * @returns returns the intersection rectangle between A and B or null
 */
export const rectangleIntersection = (
  A: GeometryBounds,
  B: GeometryBounds,
): GeometryBounds | null => {
  const intersectionX1 = Math.max(A.left, B.left);
  const intersectionX2 = Math.min(A.left + A.width, B.left + B.width);
  if (intersectionX2 <= intersectionX1) {
    return null;
  }

  const intersectionY1 = Math.max(A.top, B.top);
  const intersectionY2 = Math.min(A.top + A.height, B.top + B.height);
  if (intersectionY2 <= intersectionY1) {
    return null;
  }

  const intersection = {
    left: intersectionX1,
    top: intersectionY1,
    width: intersectionX2 - intersectionX1,
    height: intersectionY2 - intersectionY1,
  };

  if (Object.values(intersection).some(isNaN)) {
    return null;
  }

  return intersection;
};

export const isIntersecting = (A: Bounds, B: Bounds): boolean => {
  return (
    A.x < B.x + B.width &&
    A.x + A.width > B.x &&
    A.y < B.y + B.height &&
    A.y + A.height > B.y
  );
};

export const rectContains = (reference: Bounds, candidate: Bounds): boolean => {
  return (
    reference.x < candidate.x &&
    reference.y < candidate.y &&
    reference.x + reference.width > candidate.x + candidate.width &&
    reference.y + reference.height > candidate.y + candidate.height
  );
};

/**
 * Calculates how much of rectangle A's area is covered by rectangle B
 * @returns coverage of A by B
 */
export const areaCoverage = (A: GeometryBounds, B: GeometryBounds) => {
  const intersection = rectangleIntersection(A, B);
  if (!intersection) {
    return 0;
  }

  const areaA = A.width * A.height;
  const areaIntersection = intersection.width * intersection.height;

  return areaIntersection / areaA;
};

/**
 * Adjust a given coordinate point to its closest position on the grid
 */
export const snapToGrid = (value: number, snapSize: number): number =>
  Math.round(value / snapSize) * snapSize;

/**
 * Calculates the position of an HTML object within the visible frame, centered based on its width and height.
 *
 * @param width - The width of the HTML object.
 * @param height - The height of the HTML object.
 * @param visibleFrame - The current visible frame (with width and height).
 * @returns The calculated position (x, y) of the HTML object.
 */
export const getCenteredPositionInVisibleFrame = (
  { left, top, width, height }: GeometryBounds,
  objectBounds: GeometryArea,
): XY => {
  const eyePleasingVerticalOffset = 0.75;
  return {
    x: left + width / 2 - objectBounds.width / 2,
    y: top + (height / 2) * eyePleasingVerticalOffset - objectBounds.height / 2,
  };
};

export const distanceBetweenPoints = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) => Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));

export const getCenterPoint = (start: XY, end: XY): XY => {
  const centerX = (end.x + start.x) / 2;
  const centerY = (end.y + start.y) / 2;

  return {
    x: centerX,
    y: centerY,
  };
};

export const isPointOutsideBounds = (
  point: XY,
  bounds: XY & { width: number; height: number },
): boolean => {
  const xMax = bounds.x + bounds.width;
  const yMax = bounds.y + bounds.height;

  return (
    point.x < bounds.x || point.x > xMax || point.y < bounds.y || point.y > yMax
  );
};

export const isPointInsideBounds = (
  point: XY,
  bounds: XY & { width: number; height: number },
): boolean => {
  return !isPointOutsideBounds(point, bounds);
};

export const getEdgeNearPoint = (
  point: XY,
  bounds: XY & { width: number; height: number },
  offset: number,
): GeometryEdge | null => {
  const minX = bounds.x + offset;
  const maxX = bounds.x + bounds.width - offset;
  const minY = bounds.y + offset;
  const maxY = bounds.y + bounds.height - offset;

  const nearLeft = point.x < minX;
  const nearRight = point.x > maxX;
  const nearTop = point.y < minY;
  const nearBottom = point.y > maxY;

  if (nearTop && nearRight) {
    return "top-right";
  }
  if (nearBottom && nearRight) {
    return "bottom-right";
  }
  if (nearBottom && nearLeft) {
    return "bottom-left";
  }
  if (nearTop && nearLeft) {
    return "top-left";
  }
  if (nearTop) {
    return "top";
  }
  if (nearRight) {
    return "right";
  }
  if (nearBottom) {
    return "bottom";
  }
  if (nearLeft) {
    return "left";
  }

  return null;
};

export const boundsToGeometryBounds = (bounds: Bounds): GeometryBounds => ({
  left: bounds.x,
  top: bounds.y,
  width: bounds.width,
  height: bounds.height,
});
