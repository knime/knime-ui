import type { Bounds, XY } from "@/api/gateway-api/generated-api";

export const createXY = (data: Partial<XY>): XY => ({ x: 0, y: 0, ...data });
export const createBounds = (data: Partial<Bounds>): Bounds => ({
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  ...data,
});
