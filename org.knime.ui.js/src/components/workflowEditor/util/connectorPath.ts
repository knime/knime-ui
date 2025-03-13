/* eslint-disable max-params */
/* eslint-disable no-magic-numbers */
import type { XY } from "@/api/gateway-api/generated-api";
import { portSize } from "@/style/shapes";

export type BezierPoints = {
  start: XY;
  control1: XY;
  control2: XY;
  end: XY;
};

// These deltas are carefully chosen so that the connector line is hidden behind the flow variable line,
// especially for optional ports, even when hovering the port or the connector line.
const deltaX1 = portSize / 2 - 0.5;
const deltaX2 = portSize / 2 - 0.5;

export const getBezier = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  offsetStart = false,
  offsetEnd = false,
): BezierPoints => {
  x1 += deltaX1;
  x2 -= deltaX2;

  const width = Math.abs(x1 - x2) / 4;
  const height = Math.abs(y1 - y2) / 4;

  const xOffsetStart = offsetStart ? 4 : 0;
  const xOffsetEnd = offsetEnd ? 4 : 0;

  return {
    start: { x: x1 - xOffsetStart, y: y1 },
    control1: { x: x1 + width + height, y: y1 },
    control2: { x: x2 - width - height, y: y2 },
    end: { x: x2 + xOffsetEnd, y: y2 },
  };
};

export const getBezierPathString = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  offsetStart = false,
  offsetEnd = false,
) => {
  const { start, control1, control2, end } = getBezier(
    x1,
    y1,
    x2,
    y2,
    offsetStart,
    offsetEnd,
  );

  return (
    `M${start.x},${start.y} ` +
    `C${control1.x},${control1.y} ` +
    `${control2.x},${control2.y} ` +
    `${end.x},${end.y}`
  );
};
