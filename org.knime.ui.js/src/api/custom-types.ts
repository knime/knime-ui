import type { NodeTemplateWithExtendedPorts } from "@/util/dataMappers";

import type {
  ComponentNode,
  ComponentNodeAndDescription,
  Connection,
  EditableMetadata,
  MetaNode,
  NativeNode,
  NodeCategory,
  NodeDescription,
  PortGroup,
  PortType,
  ProjectMetadata,
  SpaceItemReference,
  XY,
  Space as _Space,
  Workflow as _Workflow,
} from "./gateway-api/generated-api";
import {
  SpaceGroup as _SpaceGroup,
  SpaceGroup as _SpaceGroupNS,
  SpaceProvider as _SpaceProvider,
  SpaceProvider as _SpaceProviderNS,
} from "./gateway-api/generated-api";

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
  type: "SHADOW_APP" | "HTML";
  path: string;
  baseUrl?: string;
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
  export import TypeEnum = _SpaceProviderNS.TypeEnum;

  export interface Space extends Omit<_Space, "_private"> {
    private?: boolean;
  }

  export interface SpaceGroup extends _SpaceGroup {
    spaces: Array<Space>;
  }

  export import UserTypeEnum = _SpaceGroupNS.TypeEnum;

  export interface SpaceProvider
    extends Omit<_SpaceProvider, "connectionMode"> {
    id: string;
    name: string;
    connected: boolean;
    connectionMode: "AUTHENTICATED" | "ANONYMOUS" | "AUTOMATIC";
    spaceGroups: Array<SpaceGroup>;
    user?: { name: string };
  }
}

// TODO: NXT-2023 remove if API codegen supports multiple inheritance:
// TODO: NXT-2023 see https://bitbucket.org/KNIME/knime-com-shared/src/4af0ebfcb4232593119415299504f22ded303b9c/com.knime.gateway.codegen/src-gen/api/web-ui/gateway.yaml#lines-1493:1496
export type ComponentMetadata = ComponentNodeAndDescription &
  NodeDescription &
  EditableMetadata;

// TODO: NXT-2023 remove if API codegen supports multiple inheritance:
export type ComponentNodeDescription = ComponentNodeAndDescription &
  NodeDescription &
  ProjectMetadata;

// TODO: NXT-2023 remove once API codegen properly types the workflow nodes
export type MetadataType = ProjectMetadata | ComponentMetadata;

// TODO: NXT-2023 remove once API codegen properly types the workflow nodes
export type Workflow = Omit<_Workflow, "nodes" | "metadata"> & {
  projectId: string;
  nodes: Record<string, KnimeNode>;
  metadata: MetadataType;
};

export interface Job {
  createdAt: number;
  createdVia: string;
  discard: boolean;
  discardAfterFailedExec: boolean;
  discardAfterSuccessfulExec: boolean;
  finishedExecutionAt: number;
  hasReport: boolean;
  id: string;
  isOutdated: boolean;
  isSwapped: boolean;
  name: string;
  owner: string;
  schedulerId: string;
  startedExecutionAt: number;
  state: string;
  workflow: string;
  nodeMessages: Array<{ message: string; messageType: string; node: string }>;
}

export interface Schedule {
  discard: boolean;
  discardAfterFailedExec: boolean;
  discardAfterSuccessfulExec: boolean;
  executionRetries: number;
  id: string;
  lastJob: string;
  lastRun: number;
  numFailures: number;
  reset: boolean;
  schedule: {
    delay: number;
    delayType: string;
    disabled: boolean;
    filter: {
      days: number[];
      daysOfWeek: string[];
      months: string[];
      times: Array<{ start: number[]; end: number[] }>;
    };
    nextScheduledExecution: number;
    skipIfPreviousJobStillRunning: boolean;
    startTime: number;
  };
  targetName: string;
  user: string;
  workflowPath: string;
}
export type WorkflowObject = XY & {
  id: string;
  type: "node" | "annotation" | "componentPlaceholder";
  width?: number;
  height?: number;
};

export type RecentWorkflow = {
  name: string;
  timeUsed: string;
  origin: SpaceItemReference;
};

export type WorkflowOrigin = Omit<SpaceItemReference, "ancestorItemIds">;

export type ExampleProject = {
  name: string;
  svg: string;
  origin: SpaceItemReference;
};

export type NodeRelation = "PREDECESSORS" | "SUCCESSORS";

export type NodeCategoryWithExtendedPorts = NodeCategory & {
  nodes?: NodeTemplateWithExtendedPorts[];
};

export type AncestorInfo = {
  ancestorItemIds: string[];
  itemName: string | null;
};

export type NameCollisionHandling =
  | "OVERWRITE"
  | "NOOP"
  | "AUTORENAME"
  | "CANCEL";

/**
 * "placeholder-in" means a connection FROM a real node TO a placeholder
 * "placeholder-out" means a connection FROM a placeholder TO a real node
 */
export type PlaceholderConnectionType = "placeholder-in" | "placeholder-out";
export type ComponentPlaceholderConnection = Omit<
  Connection,
  | "bendpoints"
  | "allowedActions"
  | "streaming"
  | "flowVariableConnection"
  | "label"
> & {
  placeholderType: PlaceholderConnectionType;
};
