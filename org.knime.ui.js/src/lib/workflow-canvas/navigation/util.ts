import type { WorkflowNavigationEventTypes } from "./types";

export const EVENT_TYPES = ["nearest"] as const;

export const isValidEvent = (eventName: string) => {
  return EVENT_TYPES.includes(eventName as WorkflowNavigationEventTypes);
};
