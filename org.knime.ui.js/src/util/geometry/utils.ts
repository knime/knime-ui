import { gsap } from "gsap";
import * as shapes from "@/style/shapes";
import type { GeometryArea, GeometryBounds } from "./types";
import type { XY } from "@/api/gateway-api/generated-api";

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

  return {
    left: intersectionX1,
    top: intersectionY1,
    width: intersectionX2 - intersectionX1,
    height: intersectionY2 - intersectionY1,
  };
};

/**
 * Calculates how much of rectangle A's area is covered by rectangle B
 * @param { Object } A area A
 * @param { Number } A.top
 * @param { Number } A.left
 * @param { Number } A.width
 * @param { Number } A.height
 *
 * @param { Object } B area B
 * @param { Number } B.top
 * @param { Number } B.left
 * @param { Number } B.width
 * @param { Number } B.height
 *
 * @returns { Number } coverage of A by B
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
export const snapToGrid = (
  value: number,
  snapSize = shapes.gridSize.x,
): number => gsap.utils.snap(snapSize, value);

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
