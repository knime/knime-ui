import type { ActionTree, GetterTree, MutationTree } from "vuex";

import { API } from "@/api";
import type { KaiMessage, XY } from "@/api/gateway-api/generated-api";
import type { NodeWithExtensionInfo } from "@/components/kai/types";
import { createUnwrappedPromise } from "@/util/createUnwrappedPromise";

import type { RootStoreState } from "./types";

/**
 * This file contains the Vuex store module for the AI assistant.
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

type AiAssistantEventPayload = {
  type: "token" | "result" | "error" | "status_update";
  payload: {
    message: Message;
    references: unknown;
    workflows: HubItem[];
    components: HubItem[];
    nodes: NodeWithExtensionInfo[];
    interactionId: string;
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

export const state = (): AiAssistantState => ({
  hubID: null,
  qa: createEmptyConversationState(),
  build: createEmptyConversationState(),
  processedInteractionIds: new Set(),
});
export const mutations: MutationTree<AiAssistantState> = {
  setHubID(state, hubID) {
    state.hubID = hubID;
  },
  pushMessage(
    state,
    payload: {
      chainType: ChainType;
      role: Message["role"];
      content: string;
      nodes: Message["nodes"];
      references: Message["references"];
      workflows: Message["workflows"];
      components: Message["components"];
      interactionId?: string;
      isError?: boolean;
    },
  ) {
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

    state[chainType].messages.push({
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
  popUserQuery(state, { chainType }: { chainType: ChainType }) {
    const messages = state[chainType].messages;
    const lastMessage = messages.at(-1);
    if (lastMessage?.role === "user") {
      messages.pop();
    }
  },
  setStatusUpdate(
    state,
    {
      chainType,
      statusUpdate,
    }: { chainType: ChainType; statusUpdate: StatusUpdate | null },
  ) {
    state[chainType].statusUpdate = statusUpdate;
  },
  setIsProcessing(
    state,
    {
      chainType,
      isProcessing,
    }: { chainType: ChainType; isProcessing: boolean },
  ) {
    state[chainType].isProcessing = isProcessing;
  },
  addToken(
    state,
    { chainType, token }: { chainType: ChainType; token: string },
  ) {
    state[chainType].incomingTokens += token;
  },
  setProjectAndWorkflowIds(
    state,
    {
      chainType,
      projectAndWorkflowIds,
    }: {
      chainType: ChainType;
      projectAndWorkflowIds: { workflowId: string; projectId: string };
    },
  ) {
    state[chainType].projectAndWorkflowIds = projectAndWorkflowIds;
  },
  clearChain(state, { chainType }: { chainType: ChainType }) {
    state[chainType].isProcessing = false;
    state[chainType].incomingTokens = "";
    state[chainType].statusUpdate = null;
    state[chainType].projectAndWorkflowIds = null;
  },
  clearConversation(state, { chainType }: { chainType: ChainType }) {
    state[chainType] = createEmptyConversationState();
  },
  setConversationId(
    state,
    {
      chainType,
      conversationId,
    }: { chainType: ChainType; conversationId: string | null },
  ) {
    state[chainType].conversationId = conversationId;
  },
};

export const actions: ActionTree<AiAssistantState, RootStoreState> = {
  async getHubID({ commit }) {
    commit("setHubID", await API.desktop.getHubID());
  },
  clearConversation({ commit }, { chainType }: { chainType: ChainType }) {
    commit("clearConversation", { chainType });
  },
  async makeAiRequest(
    { commit, state, rootGetters },
    {
      chainType,
      message,
      targetNodes = [],
      startPosition,
    }: {
      chainType: ChainType;
      message: Message;
      targetNodes?: string[];
      startPosition?: XY;
    },
  ) {
    const projectAndWorkflowIds = rootGetters["workflow/projectAndWorkflowIds"];
    const selectedNodes = targetNodes.length
      ? targetNodes
      : rootGetters["selection/selectedNodeIds"];

    commit("setIsProcessing", { chainType, isProcessing: true });
    commit("setProjectAndWorkflowIds", { chainType, projectAndWorkflowIds });
    commit("pushMessage", { chainType, role: "user", content: message });

    const messages = state[chainType].messages.map(({ role, content }) => ({
      role,
      content,
    }));

    const conversationId = state[chainType].conversationId;
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
      const { resolve, reject, promise } = createUnwrappedPromise();
      responseCallback[chainType] = { resolve, reject };

      return promise;
    } catch (error) {
      consola.error("makeAiRequest", error);
      commit("clearChain", { chainType });
      commit("pushMessage", {
        chainType,
        role: "assistant",
        content: "Sorry, something went wrong. Please try again later!",
        isError: true,
      });

      return Promise.resolve();
    }
  },
  async submitFeedback(
    { state, rootGetters },
    { interactionId, feedback }: { interactionId: string; feedback: Feedback },
  ) {
    const projectAndWorkflowIds = rootGetters["workflow/projectAndWorkflowIds"];
    const { projectId } = projectAndWorkflowIds;

    state.processedInteractionIds.add(interactionId);

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
  handleAiAssistantEvent(
    { commit },
    {
      chainType,
      data: { type, payload, conversation_id: conversationId },
    }: { chainType: ChainType; data: AiAssistantEventPayload },
  ) {
    switch (type) {
      case "token":
        commit("addToken", { chainType, token: payload });
        break;
      case "result":
        commit("clearChain", { chainType });
        commit("setConversationId", { chainType, conversationId });

        if (payload.message) {
          commit("pushMessage", {
            chainType,
            role: "assistant",
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
        commit("clearChain", { chainType });
        commit("setConversationId", { chainType, conversationId });

        commit("pushMessage", {
          chainType,
          role: "assistant",
          content: payload.message,
          isError: true,
        });

        responseCallback[chainType]?.reject(payload);
        delete responseCallback[chainType];

        break;
      case "status_update":
        commit("setStatusUpdate", {
          chainType,
          statusUpdate: payload,
        });
        break;
    }
  },
  async abortAiRequest({ commit }, { chainType }: { chainType: ChainType }) {
    try {
      await API.kai.abortAiRequest({ kaiChainId: chainType });
    } catch (error) {
      consola.error("abortAiRequest", error);
      commit("clearChain", { chainType });
    }
    commit("popUserQuery", { chainType });
  },
};

export const getters: GetterTree<AiAssistantState, RootStoreState> = {
  isQuickBuildAvailableForPort(state, getters, rootState) {
    return (nodeRelation: string, portTypeId: string | null) => {
      const availablePortTypes = rootState.application.availablePortTypes;

      return (
        nodeRelation === "SUCCESSORS" &&
        portTypeId &&
        availablePortTypes[portTypeId]?.kind === "table"
      );
    };
  },
  isFeedbackProcessed(state) {
    return (interactionId: string) =>
      state.processedInteractionIds.has(interactionId);
  },
};
