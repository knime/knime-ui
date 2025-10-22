import {
  KaiMessage,
  KaiQuickActionRequest,
  type KaiUsage,
} from "@/api/gateway-api/generated-api";

export type Node = {
  title: string;
  factoryName: string;
  factoryId: string;
};

export type Extension = {
  featureSymbolicName: string;
  featureName: string;
  owner: string;
};

export type NodeWithExtensionInfo = Node & Extension;

export type ExtensionWithNodes = Extension & {
  nodes: Node[];
};

export type Extensions = Record<string, ExtensionWithNodes>;

export type References = Record<string, string[]>;

export type HubItem = {
  id: string;
  title: string;
  itemType: string;
  description: string;
  pathToResource: string;
  url: string;
};

export type Message = KaiMessage & {
  nodes?: NodeWithExtensionInfo[];
  references?: References;
  workflows?: HubItem[];
  components?: HubItem[];
  interactionId?: string;
  isError?: boolean;
  timestamp?: number;
  kind?: "quick-build-explanation" | "other";
};

export type ProjectAndWorkflowIds = {
  projectId: string;
  workflowId: string;
};

export type StatusUpdate = {
  message: string;
  type?: "INFO" | "WORKFLOW_BUILDING" | "NODE_ADDED";
};

export type ConversationState = {
  conversationId: string | null;
  messages: Message[];
  statusUpdate: StatusUpdate | null;
  isProcessing: boolean;
  incomingTokens: string;
  projectAndWorkflowIds: ProjectAndWorkflowIds | null;
};

export type KaiUsageState = KaiUsage | null;

export type AiAssistantState = {
  hubID: string | null;
  qa: ConversationState;
  build: ConversationState;
  processedInteractionIds: Set<string>;
  usage: KaiUsageState;
};

export type Feedback = {
  isPositive: boolean;
  comment: string;
};

export type ChainType = Exclude<
  keyof AiAssistantState,
  "hubID" | "processedInteractionIds" | "usage"
>;

export type AiAssistantQAEventPayload = {
  message: string;
  references: Message["references"];
  workflows: Message["workflows"];
  components: Message["components"];
  nodes: NodeWithExtensionInfo[];
  interactionId: string;
  usage?: KaiUsage;
};

export type AiAssistantBuildEventPayload = {
  message: string;
  interactionId: string;
  type: "SUCCESS" | "INPUT_NEEDED";
  references: never;
  workflows: never;
  components: never;
  nodes: never;
  usage?: KaiUsage;
};

export type AiAssistantEvent =
  | {
      type: "result";
      payload: AiAssistantQAEventPayload | AiAssistantBuildEventPayload;
      conversation_id: string;
    }
  | {
      type: "token";
      payload: string;
      conversation_id: string;
    }
  | {
      type: "status_update";
      payload: StatusUpdate;
      conversation_id: string;
    }
  | {
      type: "error";
      payload: {
        message: string;
      };
      conversation_id: string;
    };

// =======AI QUICK ACTIONS=======
export type QuickActionId = KaiQuickActionRequest.ActionIdEnum;
export const QuickActionId = KaiQuickActionRequest.ActionIdEnum;
