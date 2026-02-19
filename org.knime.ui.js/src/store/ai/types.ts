import {
  type KaiInquiry,
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

/**
 * A trace of how the user (or auto-response logic) responded to a K-AI inquiry.
 * Stored on conversation-level during processing (`pendingInquiryTraces`), and at
 * message-level once processing is complete (`inquiryTraces`).
 */
export type InquiryTrace = {
  inquiry: KaiInquiry;
  selectedOptionId: string;
  /** Optional label suffix rendered in parentheses next to the selected option, e.g. "Saved" or "Remembered" */
  suffix?: string;
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
  inquiryTraces?: InquiryTrace[];
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
  /**
   * The inquiry K-AI is currently waiting on the user to respond to. Set when
   * K-AI needs to clarify something mid-response. cleared once the user (or
   * auto-response logic) submits an answer via `respondToInquiry`.
   */
  pendingInquiry: KaiInquiry | null;
  /**
   * Traces of each inquiry the user has responded to during the current
   * response generation. K-AI can send more than one inquiry per response, so
   * traces accumulate here until K-AI finishes, at which point they are
   * attached to its final message and cleared.
   */
  pendingInquiryTraces: InquiryTrace[];
};

export type KaiUsageState = KaiUsage | null;

export type AiAssistantState = {
  hubID: string | null;
  qa: ConversationState;
  build: ConversationState;
  processedInteractionIds: Set<string>;
  usage: KaiUsageState;
  isUserLicensed: boolean;
  unlicensedUserMessage: string | null;
};

export type Feedback = {
  isPositive: boolean;
  comment: string;
};

export type ChainType = Exclude<
  keyof AiAssistantState,
  | "hubID"
  | "processedInteractionIds"
  | "usage"
  | "isUserLicensed"
  | "unlicensedUserMessage"
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

/**
 * Types of events that can be received from the BE during processing of a chat message.
 */
export type AiAssistantEvent =
  // final event that indicates conclusion of processing
  | {
      type: "result";
      payload: AiAssistantQAEventPayload | AiAssistantBuildEventPayload;
      conversation_id: string;
    }
  // a single token being streamed in (when K-AI is generating a response in Q&A mode)
  | {
      type: "token";
      payload: string;
      conversation_id: string;
    }
  // status is used to indicate the state of processing, e.g. "Thinking..." or "Searching for nodes"
  | {
      type: "status_update";
      payload: StatusUpdate;
      conversation_id: string;
    }
  // final event that indicates an erroneous conclusion of processing
  | {
      type: "error";
      payload: {
        message: string;
      };
      conversation_id: string;
    }
  // an event indicating a mid-processing inquiry from K-AI to user
  | {
      type: "inquiry";
      payload: KaiInquiry;
      conversation_id: string;
    };

// =======AI QUICK ACTIONS=======
export type QuickActionId = KaiQuickActionRequest.ActionIdEnum;
export const QuickActionId = KaiQuickActionRequest.ActionIdEnum;
