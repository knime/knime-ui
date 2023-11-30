import type { XY } from "@/api/gateway-api/generated-api";

export const EVENT_TYPES = ["nearest"] as const;

export type EventTypes = (typeof EVENT_TYPES)[number];
export type Direction = "top" | "bottom" | "left" | "right";
export type PointNode = XY & { id: string };

export const isValidEvent = (eventName: string) => {
  return EVENT_TYPES.includes(eventName as EventTypes);
};
