import type { WorkflowObject } from "@/api/custom-types";

export const EVENT_TYPES = ["nearest"] as const;

export type EventTypes = (typeof EVENT_TYPES)[number];
export type Direction = "top" | "bottom" | "left" | "right";
export type GenericWorkflowObject = Omit<WorkflowObject, "type">;

export type WorkerMessage<T> = { type: EventTypes; payload: T };

export type FindNearestObjectPayload = {
  /**
   * list of objects to consider for the nearest neighbor search
   */
  objects: WorkflowObject[];
  /**
   * object to use as the reference for the search
   */
  reference: GenericWorkflowObject;
  /**
   * direction from which to search for the neighbor
   */
  direction: Direction;
};

export const isValidEvent = (eventName: string) => {
  return EVENT_TYPES.includes(eventName as EventTypes);
};
