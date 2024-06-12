import type { ActionTree, GetterTree, MutationTree } from "vuex";

import { API } from "@api";
import { omit } from "lodash-es";
import type { RootStoreState } from "./types";
import type { NodeWithExtensionInfo } from "@/components/kaiSidebar/types";
import type { KaiMessage } from "@/api/gateway-api/generated-api";

const LOCAL_STORAGE_KEY = "aiAssistantState";

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

type PersistedConversationState = {
  [K in ChainType]: Pick<ConversationState, "conversationId" | "messages">;
};

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

export const state = (): AiAssistantState => {
  let persistedState: PersistedConversationState | null;
  try {
    const persistedStateString = localStorage.getItem(LOCAL_STORAGE_KEY);
    persistedState = persistedStateString
      ? JSON.parse(persistedStateString)
      : {};
  } catch (error) {
    persistedState = null;
    consola.error("Error loading persisted AI Assistant state:", error);
  }

  return {
    hubID: null,
    qa: {
      ...createEmptyConversationState(),
      ...(persistedState?.qa || {}),
    },
    build: {
      ...createEmptyConversationState(),
      ...(persistedState?.build || {}),
    },
  };
};

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
  pushMessage(
    { commit, dispatch },
    payload: {
      chainType: ChainType;
      role: Message["role"];
      content: string;
      nodes: Message["nodes"];
      references: Message["references"];
      isError?: boolean;
    },
  ) {
    commit("pushMessage", payload);
    dispatch("persistStateToLocalStorage");
  },
  clearConversationAndPersistState(
    { commit, dispatch },
    { chainType }: { chainType: ChainType },
  ) {
    commit("clearConversation", { chainType });
    dispatch("persistStateToLocalStorage");
  },
  async makeAiRequest(
    { commit, state, rootGetters },
    { chainType, message }: { chainType: ChainType; message: Message },
  ) {
    const projectAndWorkflowIds = rootGetters["workflow/projectAndWorkflowIds"];
    const selectedNodes = rootGetters["selection/selectedNodeIds"];

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
    { commit, dispatch },
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
          dispatch("pushMessage", {
            chainType,
            role: "assistant",
            content: payload.message,
            nodes: payload.nodes,
            references: payload.references,
            feedbackId: payload.interactionId,
          });
        }
        break;
      case "error":
        commit("clearChain", { chainType });
        commit("setConversationId", { chainType, conversationId });

        dispatch("pushMessage", {
          chainType,
          role: "assistant",
          content: payload.message,
          isError: true,
        });
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
  persistStateToLocalStorage({ state }) {
    const data: PersistedConversationState = {
      qa: {
        conversationId: state.qa.conversationId,
        messages: state.qa.messages.map((message) =>
          omit(message, "feedbackId"),
        ),
      },
      build: {
        conversationId: state.build.conversationId,
        messages: state.build.messages.map((message) =>
          omit(message, "feedbackId"),
        ),
      },
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  },
};

export const getters: GetterTree<AiAssistantState, RootStoreState> = {};
