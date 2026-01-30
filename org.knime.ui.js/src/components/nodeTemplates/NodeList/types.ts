import type {
  ComponentNodeTemplateWithExtendedPorts,
  NodeTemplateWithExtendedPorts,
} from "@/util/dataMappers";

export type ListItem =
  | NodeTemplateWithExtendedPorts
  | ComponentNodeTemplateWithExtendedPorts;

export const navigationKeys = [
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
] as const;

export type NavigationKey = (typeof navigationKeys)[number];
export type NavReachedEvent = { key: NavigationKey; startIndex: number };
