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
  Workflow as _Workflow,
  EditableProjectMetadata,
  NodeTemplate,
  XY,
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
  // eslint-disable-next-line unused-imports/no-unused-vars
  export import TypeEnum = _SpaceProviderNS.TypeEnum;

  export interface Space extends Omit<_Space, "_private"> {
    private: boolean;
  }

  export interface SpaceProvider extends _SpaceProvider {
    id: string;
    name: string;
    connected: boolean;
    connectionMode: "AUTHENTICATED" | "ANONYMOUS" | "AUTOMATIC";
    spaces: Array<Space>;
    user?: SpaceUser;
  }
}

// TODO: NXT-2023 remove if API codegen supports multiple inheritance:
// TODO: NXT-2023 see https://bitbucket.org/KNIME/knime-com-shared/src/4af0ebfcb4232593119415299504f22ded303b9c/com.knime.gateway.codegen/src-gen/api/web-ui/gateway.yaml#lines-1493:1496
export type ComponentMetadata = ComponentNodeAndDescription &
  NodeDescription &
  EditableProjectMetadata;

// TODO: NXT-2023 remove once API codegen properly types the workflow nodes
export type Workflow = Omit<_Workflow, "nodes" | "componentMetadata"> & {
  projectId: string;
  nodes: Record<string, KnimeNode>;
  componentMetadata?: ComponentMetadata;
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

export type ExtendedPortType = PortType & {
  typeId: string;
  type?: string;
  description: string;
};

export type NodeTemplateWithExtendedPorts = NodeTemplate & {
  inPorts: ExtendedPortType[];
  outPorts: ExtendedPortType[];
};

export type WorkflowObject = XY & { id: string; type: "node" | "annotation" };
