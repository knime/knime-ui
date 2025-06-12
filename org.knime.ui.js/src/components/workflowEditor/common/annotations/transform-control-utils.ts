import type { Bounds } from "@/api/gateway-api/generated-api";
import { geometry } from "@/util/geometry";

export const DIRECTIONS = ["nw", "n", "ne", "w", "e", "sw", "s", "se"] as const;
export type Directions = (typeof DIRECTIONS)[number];

type XTransform = { startX: number; moveX: number; origWidth: number };
type YTransform = { startY: number; moveY: number; origHeight: number };
type TransformParams = XTransform & YTransform;
type DirectionHandler = (
  currentBounds: Bounds,
  params: TransformParams,
) => Bounds;

const MIN_DIMENSIONS = { width: 0, height: 0 };
const MAX_DIMENSIONS = { width: 6000, height: 6000 };

const isValidHeight = (value: number) =>
  value > MIN_DIMENSIONS.height && value <= MAX_DIMENSIONS.height;
const isValidWidth = (value: number) =>
  value > MIN_DIMENSIONS.width && value <= MAX_DIMENSIONS.width;

/**
 *
 * @param xTransform transform params for the X axis
 * @param flushed whether the delta should account for the width
 * @returns the new delta
 */
const getDeltaX = (
  { startX, moveX, origWidth }: XTransform,
  flushed = false,
) => (flushed ? moveX - (startX + origWidth) : moveX - startX);

/**
 *
 * @param yTransform transform params for the X axis
 * @param flushed whether the delta should account for the height
 * @returns the new delta
 */
const getDeltaY = (
  { startY, moveY, origHeight }: YTransform,
  flushed = false,
) => (flushed ? moveY - (startY + origHeight) : moveY - startY);

const directionHandlers: Record<Directions, DirectionHandler> = {
  // north-west
  nw: (
    currentBounds,
    { startX, startY, moveX, moveY, origWidth, origHeight },
  ) => {
    const deltaX = getDeltaX({ startX, moveX, origWidth });
    const deltaY = getDeltaY({ startY, moveY, origHeight });
    const nextWidth = origWidth + deltaX * -1;
    const nextHeight = origHeight + deltaY * -1;

    return {
      ...currentBounds,

      x: isValidWidth(nextWidth) ? moveX : currentBounds.x,
      width: isValidWidth(nextWidth) ? nextWidth : currentBounds.width,

      y: isValidHeight(nextHeight) ? moveY : currentBounds.y,
      height: isValidHeight(nextHeight) ? nextHeight : currentBounds.height,
    };
  },

  // north
  n: (currentBounds, { moveY, origHeight, startY }) => {
    const deltaY = getDeltaY({ startY, moveY, origHeight });
    const nextHeight = origHeight + deltaY * -1;

    return {
      ...currentBounds,

      y: isValidHeight(nextHeight) ? moveY : currentBounds.y,
      height: isValidHeight(nextHeight) ? nextHeight : currentBounds.height,
    };
  },

  // north-east
  ne: (
    currentBounds,
    { startX, startY, moveX, moveY, origHeight, origWidth },
  ) => {
    const deltaX = getDeltaX({ startX, moveX, origWidth }, true);
    const deltaY = getDeltaY({ startY, moveY, origHeight });
    const nextWidth = origWidth + deltaX;
    const nextHeight = origHeight + deltaY * -1;

    return {
      ...currentBounds,

      width: isValidWidth(nextWidth) ? nextWidth : currentBounds.width,

      y: isValidHeight(nextHeight) ? moveY : currentBounds.y,
      height: isValidHeight(nextHeight) ? nextHeight : currentBounds.height,
    };
  },

  // east
  e: (currentBounds, { startX, moveX, origWidth }) => {
    const deltaX = getDeltaX({ startX, moveX, origWidth }, true);
    const nextWidth = origWidth + deltaX;

    return {
      ...currentBounds,

      width: isValidWidth(nextWidth) ? nextWidth : currentBounds.width,
    };
  },

  // south-east
  se: (
    currentBounds,
    { startX, startY, origWidth, origHeight, moveX, moveY },
  ) => {
    const deltaX = getDeltaX({ startX, moveX, origWidth }, true);
    const deltaY = getDeltaY({ startY, moveY, origHeight }, true);
    const nextWidth = origWidth + deltaX;
    const nextHeight = origHeight + deltaY;

    return {
      ...currentBounds,

      width: isValidWidth(nextWidth) ? nextWidth : currentBounds.width,
      height: isValidHeight(nextHeight) ? nextHeight : currentBounds.height,
    };
  },

  // south
  s: (currentBounds, { startY, origHeight, moveY }) => {
    const deltaY = getDeltaY({ startY, moveY, origHeight }, true);
    const nextHeight = origHeight + deltaY;

    return {
      ...currentBounds,

      height: isValidHeight(nextHeight) ? nextHeight : currentBounds.height,
    };
  },

  // south-west
  sw: (
    currentBounds,
    { startX, startY, moveX, moveY, origWidth, origHeight },
  ) => {
    const deltaX = getDeltaX({ startX, moveX, origWidth });
    const deltaY = getDeltaY({ startY, moveY, origHeight }, true);
    const nextWidth = origWidth + deltaX * -1;
    const nextHeight = origHeight + deltaY;

    return {
      ...currentBounds,

      x: isValidWidth(nextWidth) ? moveX : currentBounds.x,
      width: isValidWidth(nextWidth) ? nextWidth : currentBounds.width,

      height: isValidHeight(nextHeight) ? nextHeight : currentBounds.height,
    };
  },

  // west
  w: (currentBounds, { startX, moveX, origWidth }) => {
    const deltaX = getDeltaX({ startX, moveX, origWidth });
    const nextWidth = origWidth + deltaX * -1;

    return {
      ...currentBounds,

      x: isValidWidth(nextWidth) ? moveX : currentBounds.x,
      width: isValidWidth(nextWidth) ? nextWidth : currentBounds.width,
    };
  },
};

export const getGridAdjustedBounds = (bounds: Bounds): Bounds => ({
  x: geometry.utils.snapToGrid(bounds.x),
  y: geometry.utils.snapToGrid(bounds.y),
  width: geometry.utils.snapToGrid(bounds.width),
  height: geometry.utils.snapToGrid(bounds.height),
});

export const transformBounds = (
  currentBounds: Bounds,
  {
    startX,
    startY,
    moveX,
    moveY,
    origWidth,
    origHeight,
    direction,
  }: TransformParams & { direction: Directions },
) => {
  const defaultHandler = () => currentBounds;
  const directionHandler = directionHandlers[direction] || defaultHandler;
  const newBounds = directionHandler(currentBounds, {
    moveX,
    moveY,
    startX,
    startY,
    origWidth,
    origHeight,
  });

  return getGridAdjustedBounds(newBounds);
};

export const getTransformControlPosition = (params: {
  bounds: Bounds;
  direction: Directions;
  controlSize: number;
}) => {
  const { bounds, direction } = params;
  const OFFSET = params.controlSize / 2;

  const { x, y, width, height } = bounds;
  const offset = (pos: number, delta: -1 | 1 = 1) => pos - OFFSET * delta;

  const centerX = () => offset(x + width / 2);
  const centerY = () => offset(y + height / 2);

  const flushX = () => offset(x + width - params.controlSize, -1);
  const flushY = () => offset(y + height - params.controlSize, -1);

  const positionMap: Record<Directions, { x: number; y: number }> = {
    nw: { x: offset(x), y: offset(y) },
    n: { x: centerX(), y: offset(y) },
    ne: { x: flushX(), y: offset(y) },
    e: { x: flushX(), y: centerY() },
    se: { x: flushX(), y: flushY() },
    s: { x: centerX(), y: flushY() },
    sw: { x: offset(x), y: flushY() },
    w: { x: offset(x), y: centerY() },
  };

  return positionMap[direction] || { x, y };
};
