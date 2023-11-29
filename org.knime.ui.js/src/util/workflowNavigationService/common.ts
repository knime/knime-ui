export const EVENT_TYPES = ["create", "insert", "nearest"] as const;

export type EventTypes = (typeof EVENT_TYPES)[number];

export const isValidEvent = (eventName: string) => {
  return EVENT_TYPES.includes(eventName as EventTypes);
};
