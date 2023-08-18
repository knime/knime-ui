import type {
  ComponentNode,
  MetaNode,
  NativeNode,
  PortGroup,
  PortType,
  Space as _Space,
  ComponentNodeAndDescription,
  NodeDescription,
  SpaceProvider as _SpaceProvider,
} from "./gateway-api/generated-api";

import { SpaceProvider as _SpaceProviderNS } from "./gateway-api/generated-api";

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
  type: "VUE_COMPONENT_LIB" | "HTML";
};
export type ViewConfig = {
  initialData: string;
  resourceInfo: ResourceInfo;
  iframeStyle?: string;
};

export type SpaceProviderId = { spaceProviderId: string };
export type SpaceId = { spaceId: string };
export type SpaceItemId = { itemId: string };
export type FullSpacePath = SpaceProviderId & SpaceId & SpaceItemId;

export interface SpaceUser {
  name: string;
}

// This is re-exported due to the mixture of desktop and gateway functionality.
// So that we have the types in the same location
export namespace SpaceProviderNS {
  // eslint-disable-next-line unused-imports/no-unused-vars
  export import TypeEnum = _SpaceProviderNS.TypeEnum;

  export interface Space extends _Space {
    private: boolean;
  }

  export interface SpaceProvider extends _SpaceProvider {
    id: string;
    name: string;
    connected: boolean;
    connectionMode: "AUTHENTICATED" | "ANONYMOUS" | "AUTOMATIC";
    local: boolean;
    spaces: Array<Space>;
    user?: SpaceUser;
  }
}

export type ComponentMetadata = ComponentNodeAndDescription & NodeDescription;

export type BendpointData = { connectionId: string; index: number };
