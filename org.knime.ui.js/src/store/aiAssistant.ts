import { API } from "@api";

/**
 * This file contains the Vuex store module for the AI assistant.
 */

interface Message {
  role: "assistant" | "user";
  content: string;
  nodes?: string[];
}

interface ProjectAndWorkflowIds {
  projectId: string;
  workflowId: string;
}

export interface AiAssistantState {
  hubID: string | null;
  qa: {
    messages: Message[];
    statusUpdate: string | null;
    isProcessing: boolean;
    projectAndWorkflowIds: ProjectAndWorkflowIds | null;
  };
  build: {
    messages: Message[];
    statusUpdate: string | null;
    isProcessing: boolean;
    projectAndWorkflowIds: ProjectAndWorkflowIds | null;
  };
}

export const state = (): AiAssistantState => ({
  hubID: null,
  qa: {
    messages: [],
    statusUpdate: null,
    isProcessing: false,
    projectAndWorkflowIds: null,
  },
  build: {
    messages: [],
    statusUpdate: null,
    isProcessing: false,
    projectAndWorkflowIds: null,
  },
});

export const mutations = {
  setHubID(state, hubID) {
    state["hubID"] = hubID;
  },
  pushMessage(state, { chainType, role, content, nodes, isError = false }) {
    state[chainType].messages.push({ role, content, nodes, isError });
  },
  setStatusUpdate(state, { chainType, statusUpdate }) {
    state[chainType].statusUpdate = statusUpdate;
  },
  setIsProcessing(state, { chainType, isProcessing }) {
    state[chainType].isProcessing = isProcessing;
  },
  setProjectAndWorkflowIds(state, { chainType, projectAndWorkflowIds }) {
    state[chainType].projectAndWorkflowIds = projectAndWorkflowIds;
  },
  clearChain(state, { chainType }) {
    state[chainType].isProcessing = false;
    state[chainType].statusUpdate = false;
    state[chainType].projectAndWorkflowIds = null;
  },
};

export const actions = {
  getHubID({ commit }) {
    commit("setHubID", API.desktop.getHubID());
  },
  makeAiRequest({ commit, state, rootGetters }, { chainType, message }) {
    const projectAndWorkflowIds = rootGetters["workflow/projectAndWorkflowIds"];
    const nodeId = rootGetters["selection/singleSelectedNode"]?.id;

    commit("setIsProcessing", { chainType, isProcessing: true });
    commit("setProjectAndWorkflowIds", { chainType, projectAndWorkflowIds });
    commit("pushMessage", { chainType, role: "user", content: message });

    const messages = state[chainType].messages.map(({ role, content }) => ({
      role,
      content,
    }));

    const { projectId, workflowId } = projectAndWorkflowIds;
    try {
      API.desktop.makeAiRequest({
        chainType,
        projectId,
        workflowId,
        nodeId,
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
  handleAiAssistantEvent({ commit }, { chainType, data: { type, payload } }) {
    switch (type) {
      case "result":
        commit("clearChain", { chainType });

        if (payload.message) {
          commit("pushMessage", {
            chainType,
            role: "assistant",
            content: payload.message,
            nodes: payload.nodes,
          });
        }
        break;
      case "error":
        commit("clearChain", { chainType });

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
  abortAiRequest({ commit }, { chainType }) {
    try {
      API.desktop.abortAiRequest({ chainType });
    } catch (error) {
      consola.error("abortAiRequest", error);
      commit("clearChain", { chainType });
    }
  },
};

export const getters = {};
