import type {
  ComponentNode,
  MetaNode,
  NativeNode,
  PortGroup,
  PortType,
} from "./generated-api";

/**
 * Dictionary of all available port types that are installed in the AP for the use.
 * (provided by the backend)
 */
export type AvailablePortTypes = Record<string, PortType>;

export type KnimeNode = NativeNode | ComponentNode | MetaNode;

/**
 * Dictionary of PortGroups that a native node contains
 */
export type NodePortGroups = Record<string, PortGroup>;

// TODO: UIEXT-932 remove types once they can be generated automatically
export type ResourceInfo = {
  id: string;
  type: "VUE_COMPONENT_LIB" | "VUE_COMPONENT_REFERENCE";
};
export type ViewConfig = {
  initialData: string;
  resourceInfo: ResourceInfo;
};
