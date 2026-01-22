import type { WorkflowObject } from "../types";

import type { EVENT_TYPES } from "./util";

export type WorkflowNavigationEventTypes = (typeof EVENT_TYPES)[number];
export type WorkflowNavigationDirection = "top" | "bottom" | "left" | "right";
export type GenericWorkflowObject = Omit<WorkflowObject, "type">;

export type WorkerMessage<T> = {
  type: WorkflowNavigationEventTypes;
  payload: T;
};

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
  direction: WorkflowNavigationDirection;
};
