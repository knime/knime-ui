import { API } from "@api";
import { isEmpty, isUndefined } from "lodash-es";
import { defineStore } from "pinia";

import type { NodeRelation } from "@/api/custom-types";
import { KaiMessage, type XY } from "@/api/gateway-api/generated-api";
import type { NodeWithExtensionInfo } from "@/components/kai/types";
import { useApplicationStore } from "@/store/application/application";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { createUnwrappedPromise } from "@/util/createUnwrappedPromise";

import { useSelectionStore } from "./selection";

/**
 * This file contains the store module for the AI assistant.
 */
export interface HubItem {
  id: string;
  title: string;
  itemType: string;
  description: string;
  pathToResource: string;
  url: string;
}

export interface Message extends KaiMessage {
  nodes?: NodeWithExtensionInfo[];
  references?: {
    [refName: string]: string[];
  };
  workflows?: HubItem[];
  components?: HubItem[];
  interactionId?: string;
  isError?: boolean;
  timestamp?: number;
  kind?: "quick-build-explanation" | "other";
}

interface ProjectAndWorkflowIds {
  projectId: string;
  workflowId: string;
}

export interface StatusUpdate {
  message: string;
  type?: "INFO" | "WORKFLOW_BUILDING";
}

interface ConversationState {
  conversationId: string | null;
  messages: Message[];
  statusUpdate: StatusUpdate | null;
  isProcessing: boolean;
  incomingTokens: string;
  projectAndWorkflowIds: ProjectAndWorkflowIds | null;
}

export interface AiAssistantState {
  hubID: string | null;
  qa: ConversationState;
  build: ConversationState;
  processedInteractionIds: Set<string>;
}

export interface Feedback {
  isPositive: boolean;
  comment: string;
}

type ChainType = Exclude<
  keyof AiAssistantState,
  "hubID" | "processedInteractionIds"
>;

type AiAssistantQAEventPayload = {
  message: string;
  references: Message["references"];
  workflows: Message["workflows"];
  components: Message["components"];
  nodes: NodeWithExtensionInfo[];
  interactionId: string;
};

export type AiAssistantBuildEventPayload = {
  message: string;
  interactionId: string;
  type: "SUCCESS" | "INPUT_NEEDED";
  references: never;
  workflows: never;
  components: never;
  nodes: never;
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

const responseCallback: Record<
  string,
  { resolve: CallableFunction; reject: CallableFunction }
> = {};

const createEmptyConversationState = (): ConversationState => {
  return {
    conversationId: null,
    messages: [],
    statusUpdate: null,
    isProcessing: false,
    incomingTokens: "",
    projectAndWorkflowIds: null,
  };
};

export const useAIAssistantStore = defineStore("aiAssistant", {
  state: (): AiAssistantState => ({
    hubID: null,
    qa: createEmptyConversationState(),
    build: createEmptyConversationState(),
    processedInteractionIds: new Set(),
  }),
  actions: {
    setHubID(hubID: string | null) {
      this.hubID = hubID;
    },

    pushMessage(payload: {
      chainType: ChainType;
      role: Message["role"];
      content: string;
      nodes?: Message["nodes"];
      references?: Message["references"];
      workflows?: Message["workflows"];
      components?: Message["components"];
      interactionId?: string;
      isError?: boolean;
    }) {
      const {
        chainType,
        role,
        content,
        nodes,
        references,
        workflows,
        components,
        interactionId = "",
        isError = false,
      } = payload;

      const timestamp = Date.now();

      this[chainType].messages.push({
        role,
        content,
        nodes,
        references,
        workflows,
        components,
        interactionId,
        isError,
        timestamp,
      });
    },

    popUserQuery({ chainType }: { chainType: ChainType }) {
      const messages = this[chainType].messages;
      const lastMessage = messages.at(-1);
      if (lastMessage?.role === "user") {
        messages.pop();
      }
    },

    setStatusUpdate({
      chainType,
      statusUpdate,
    }: {
      chainType: ChainType;
      statusUpdate: StatusUpdate | null;
    }) {
      this[chainType].statusUpdate = statusUpdate;
    },

    setIsProcessing({
      chainType,
      isProcessing,
    }: {
      chainType: ChainType;
      isProcessing: boolean;
    }) {
      this[chainType].isProcessing = isProcessing;
    },

    addToken({ chainType, token }: { chainType: ChainType; token: string }) {
      this[chainType].incomingTokens += token;
    },

    setProjectAndWorkflowIds({
      chainType,
      projectAndWorkflowIds,
    }: {
      chainType: ChainType;
      projectAndWorkflowIds: { workflowId: string; projectId: string };
    }) {
      this[chainType].projectAndWorkflowIds = projectAndWorkflowIds;
    },

    clearChain({ chainType }: { chainType: ChainType }) {
      this[chainType].isProcessing = false;
      this[chainType].incomingTokens = "";
      this[chainType].statusUpdate = null;
      this[chainType].projectAndWorkflowIds = null;
    },

    clearConversation({ chainType }: { chainType: ChainType }) {
      this[chainType] = createEmptyConversationState();
    },

    setConversationId({
      chainType,
      conversationId,
    }: {
      chainType: ChainType;
      conversationId: string | null;
    }) {
      this[chainType].conversationId = conversationId;
    },

    async getHubID() {
      this.setHubID(await API.desktop.getHubID());
    },

    async makeAiRequest({
      chainType,
      message,
      targetNodes = [],
      startPosition,
    }: {
      chainType: ChainType;
      message: string;
      targetNodes?: string[];
      startPosition?: XY;
    }) {
      const projectAndWorkflowIds = useWorkflowStore().getProjectAndWorkflowIds;
      const selectedNodes = targetNodes.length
        ? targetNodes
        : useSelectionStore().selectedNodeIds;

      this.setIsProcessing({ chainType, isProcessing: true });
      this.setProjectAndWorkflowIds({ chainType, projectAndWorkflowIds });
      this.pushMessage({
        chainType,
        role: KaiMessage.RoleEnum.User,
        content: message,
      });

      const messages = this[chainType].messages.map(({ role, content }) => ({
        role,
        content,
      }));

      const conversationId = this[chainType].conversationId;
      const { projectId, workflowId } = projectAndWorkflowIds;
      try {
        await API.kai.makeAiRequest({
          kaiChainId: chainType,
          kaiRequest: {
            ...(conversationId && { conversationId }),
            projectId,
            workflowId,
            selectedNodes,
            messages,
            startPosition,
          },
        });

        // Resolve/reject only after handleAiAssistantEvent receives a
        // corresponding result or error.
        const { resolve, reject, promise } = createUnwrappedPromise<
          AiAssistantQAEventPayload | AiAssistantBuildEventPayload
        >();
        responseCallback[chainType] = { resolve, reject };

        return promise;
      } catch (error) {
        consola.error("makeAiRequest", error);
        this.clearChain({ chainType });
        this.pushMessage({
          chainType,
          role: KaiMessage.RoleEnum.Assistant,
          content: "Something went wrong. Try again later.",
          isError: true,
        });

        throw error;
      }
    },

    async submitFeedback({
      interactionId,
      feedback,
    }: {
      interactionId: string;
      feedback: Feedback;
    }) {
      const projectAndWorkflowIds = useWorkflowStore().getProjectAndWorkflowIds;
      const { projectId } = projectAndWorkflowIds;

      this.processedInteractionIds.add(interactionId);

      try {
        await API.kai.submitFeedback({
          kaiFeedbackId: interactionId,
          kaiFeedback: {
            projectId,
            isPositive: feedback.isPositive,
            comment: feedback.comment,
          },
        });
      } catch (error) {
        consola.error("submitFeedback", error);
      }
    },

    handleAiAssistantEvent({
      chainType,
      data: { type, payload, conversation_id: conversationId },
    }: {
      chainType: ChainType;
      data: AiAssistantEvent;
    }) {
      switch (type) {
        case "token":
          this.addToken({ chainType, token: payload });
          break;

        case "result":
          this.clearChain({ chainType });
          this.setConversationId({ chainType, conversationId });

          if (payload.message) {
            this.pushMessage({
              chainType,
              role: KaiMessage.RoleEnum.Assistant,
              content: payload.message,
              nodes: payload.nodes,
              references: payload.references,
              workflows: payload.workflows,
              components: payload.components,
              interactionId: payload.interactionId,
            });
          }

          responseCallback[chainType]?.resolve(payload);
          delete responseCallback[chainType];
          break;

        case "error":
          this.clearChain({ chainType });
          this.setConversationId({ chainType, conversationId });

          this.pushMessage({
            chainType,
            role: KaiMessage.RoleEnum.Assistant,
            content: payload.message,
            isError: true,
          });

          responseCallback[chainType]?.reject(payload);
          delete responseCallback[chainType];
          break;

        case "status_update":
          this.setStatusUpdate({
            chainType,
            statusUpdate: payload,
          });
          break;
      }
    },

    async abortAiRequest({ chainType }: { chainType: ChainType }) {
      try {
        await API.kai.abortAiRequest({ kaiChainId: chainType });
      } catch (error) {
        consola.error("abortAiRequest", error);
        this.clearChain({ chainType });
      }
      this.popUserQuery({ chainType });
    },
  },
  getters: {
    isQuickBuildAvailableForPort: () => {
      return (nodeRelation: string | null, portTypeId: string | null) => {
        return (
          nodeRelation === "SUCCESSORS" &&
          portTypeId &&
          useApplicationStore().availablePortTypes[portTypeId]?.kind === "table"
        );
      };
    },

    isFeedbackProcessed: (state) => {
      return (interactionId: string) =>
        state.processedInteractionIds.has(interactionId);
    },

    isQuickBuildModeAvailable: () => {
      return (
        nodeRelation: NodeRelation | null,
        portTypeId: string | undefined,
      ) => {
        const supportedPortKinds = ["table"];

        const { getSelectedNodes: selectedNodes } = useSelectionStore();
        const { availablePortTypes } = useApplicationStore();

        // 1. Starting from scratch (e.g. double-click on canvas)
        if (isEmpty(selectedNodes) && isUndefined(portTypeId)) {
          return true;
        }

        // 2. Multiple nodes selected (e.g. keyboard shortcut with multiple nodes selected)
        if (selectedNodes.length > 1) {
          let portKinds = selectedNodes
            .flatMap((node) => node.outPorts)
            .map((port) => availablePortTypes[port.typeId]?.kind)
            .filter((portKind) => portKind !== "flowVariable");
          portKinds = [...new Set(portKinds)];

          const areSelectedPortKindsSupported = portKinds.every((portKind) =>
            supportedPortKinds.includes(portKind as string),
          );
          return areSelectedPortKindsSupported;
        }

        // 3. Starting from a single outport
        return (
          nodeRelation === "SUCCESSORS" &&
          portTypeId &&
          supportedPortKinds.includes(availablePortTypes[portTypeId]?.kind)
        );
      };
    },
  },
});
