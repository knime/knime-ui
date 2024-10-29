import type { ActionTree, GetterTree, MutationTree } from "vuex";

import { API } from "@/api";
import type { KaiMessage } from "@/api/gateway-api/generated-api";
import type { NodeWithExtensionInfo } from "@/components/kai/types";

import type { RootStoreState } from "./types";

/**
 * This file contains the Vuex store module for the AI assistant.
 */

export interface Message extends KaiMessage {
  nodes?: NodeWithExtensionInfo[];
  references?: {
    [refName: string]: string[];
  };
  feedbackId?: string;
  isError?: boolean;
  timestamp?: number;
}

interface ProjectAndWorkflowIds {
  projectId: string;
  workflowId: string;
}

interface ConversationState {
  conversationId: string | null;
  messages: Message[];
  statusUpdate: string | null;
  isProcessing: boolean;
  incomingTokens: string;
  projectAndWorkflowIds: ProjectAndWorkflowIds | null;
}

export interface AiAssistantState {
  hubID: string | null;
  qa: ConversationState;
  build: ConversationState;
}

export interface Feedback {
  isPositive: boolean;
  comment: string;
}

type ChainType = Exclude<keyof AiAssistantState, "hubID">;

type AiAssistantEventPayload = {
  type: "token" | "result" | "error" | "status_update";
  payload: {
    message: Message;
    references: unknown;
    nodes: NodeWithExtensionInfo[];
    interactionId: string;
  };
  conversation_id: string;
};

const responseCallbacks = new Map<string, CallableFunction>();

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
      feedbackId?: string;
      isError?: boolean;
    },
  ) {
    const {
      chainType,
      role,
      content,
      nodes,
      references,
      feedbackId = "",
      isError = false,
    } = payload;

    const timestamp = Date.now();

    state[chainType].messages.push({
      role,
      content,
      nodes,
      references,
      feedbackId,
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
    }: { chainType: ChainType; statusUpdate: string | null },
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
      targetNodes,
    }: { chainType: ChainType; message: Message; targetNodes: string[] },
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
        },
      });
    } catch (error) {
      consola.error("makeAiRequest", error);
      commit("clearChain", { chainType });
      commit("pushMessage", {
        chainType,
        role: "assistant",
        content: "Sorry, something went wrong. Please try again later!",
        isError: true,
      });
    }
  },
  async makeQuickBuildRequest(
    { dispatch, state, rootGetters },
    { message, targetNodes }: { message: Message; targetNodes: string[] },
  ) {
    await dispatch("makeAiRequest", {
      chainType: "build",
      message,
      targetNodes,
    });

    // Resolve/reject only after handleAiAssistantEvent receives a
    // corresponding result or error.
    return new Promise((resolve, reject) => {
      responseCallbacks["build"] = { resolve, reject };
    });
  },
  async submitFeedback(
    { state, rootGetters },
    {
      chainType,
      idx,
      feedback,
    }: { chainType: ChainType; idx: number; feedback: Feedback },
  ) {
    const projectAndWorkflowIds = rootGetters["workflow/projectAndWorkflowIds"];
    const { projectId } = projectAndWorkflowIds;

    const feedbackId = state[chainType].messages[idx].feedbackId;
    if (!feedbackId) {
      return;
    }
    delete state[chainType].messages[idx].feedbackId;

    try {
      await API.kai.submitFeedback({
        kaiFeedbackId: feedbackId,
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
            feedbackId: payload.interactionId,
          });
        }

        responseCallbacks[chainType]?.resolve(payload);
        responseCallbacks[chainType] = null;
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

        responseCallbacks[chainType]?.reject(payload);
        responseCallbacks[chainType] = null;
        break;
      case "status_update":
        commit("setStatusUpdate", {
          chainType,
          statusUpdate: payload.message,
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

export const getters: GetterTree<AiAssistantState, RootStoreState> = {};
