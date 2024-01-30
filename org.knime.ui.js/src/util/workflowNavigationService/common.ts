import type { Workflow } from "@/api/custom-types";
import type { XY } from "@/api/gateway-api/generated-api";

export const EVENT_TYPES = ["nearest"] as const;

export type EventTypes = (typeof EVENT_TYPES)[number];
export type Direction = "top" | "bottom" | "left" | "right";
export type WorkflowObject = XY & { id: string; type: "node" | "annotation" };
export type GenericWorkflowObject = Omit<WorkflowObject, "type">;

export type WorkerMessage<T> = { type: EventTypes; payload: T };

export type FindNearestObjectPayload = {
  workflow: Workflow;
  reference: GenericWorkflowObject;
  direction: Direction;
};

export const isValidEvent = (eventName: string) => {
  return EVENT_TYPES.includes(eventName as EventTypes);
};
