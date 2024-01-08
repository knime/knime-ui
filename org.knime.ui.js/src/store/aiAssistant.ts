import type { ActionTree, GetterTree, MutationTree } from "vuex";

import { API } from "@api";
import type { RootStoreState } from "./types";
import type { NodeWithExtensionInfo } from "@/components/kaiSidebar/types";

/**
 * This file contains the Vuex store module for the AI assistant.
 */

export interface Message {
  role: "assistant" | "user";
  content: string;
  nodes?: NodeWithExtensionInfo[];
  references?: {
    [refName: string]: string[];
  };
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

export const state = (): AiAssistantState => ({
  hubID: null,
  qa: {
    conversationId: null,
    messages: [],
    statusUpdate: null,
    isProcessing: false,
    incomingTokens: "",
    projectAndWorkflowIds: null,
  },
  build: {
    conversationId: null,
    messages: [],
    statusUpdate: null,
    isProcessing: false,
    incomingTokens: "",
    projectAndWorkflowIds: null,
  },
});

export const mutations: MutationTree<AiAssistantState> = {
  setHubID(state, hubID) {
    state.hubID = hubID;
  },
  pushMessage(
    state,
    { chainType, role, content, nodes, references, isError = false },
  ) {
    state[chainType].messages.push({
      role,
      content,
      nodes,
      references,
      isError,
    });
  },
  popUserQuery(state, { chainType }) {
    const messages = state[chainType].messages;
    const lastMessage = messages.at(-1);
    if (lastMessage?.role === "user") {
      messages.pop();
    }
  },
  setStatusUpdate(state, { chainType, statusUpdate }) {
    state[chainType].statusUpdate = statusUpdate;
  },
  setIsProcessing(state, { chainType, isProcessing }) {
    state[chainType].isProcessing = isProcessing;
  },
  addToken(state, { chainType, token }) {
    state[chainType].incomingTokens += token;
  },
  setProjectAndWorkflowIds(state, { chainType, projectAndWorkflowIds }) {
    state[chainType].projectAndWorkflowIds = projectAndWorkflowIds;
  },
  clearChain(state, { chainType }) {
    state[chainType].isProcessing = false;
    state[chainType].incomingTokens = "";
    state[chainType].statusUpdate = false;
    state[chainType].projectAndWorkflowIds = null;
  },
  setConversationId(state, { chainType, conversationId }) {
    state[chainType].conversationId = conversationId;
  },
};

export const actions: ActionTree<AiAssistantState, RootStoreState> = {
  async getHubID({ commit }) {
    commit("setHubID", await API.desktop.getHubID());
  },
  async makeAiRequest({ commit, state, rootGetters }, { chainType, message }) {
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
      await API.desktop.makeAiRequest({
        conversationId,
        chainType,
        projectId,
        workflowId,
        selectedNodes,
        messages,
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
  handleAiAssistantEvent(
    { commit },
    { chainType, data: { type, payload, conversation_id: conversationId } },
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
          });
        }
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
        break;
      case "status_update":
        commit("setStatusUpdate", {
          chainType,
          statusUpdate: payload.message,
        });
        break;
    }
  },
  async abortAiRequest({ state, commit }, { chainType }) {
    const conversationId = state[chainType].conversationId;
    try {
      await API.desktop.abortAiRequest({ conversationId, chainType });
    } catch (error) {
      consola.error("abortAiRequest", error);
      commit("clearChain", { chainType });
    }
    commit("popUserQuery", { chainType });
  },
};

export const getters: GetterTree<AiAssistantState, RootStoreState> = {};
