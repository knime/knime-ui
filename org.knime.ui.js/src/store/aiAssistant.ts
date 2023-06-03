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
  pushMessage(state, { chainType, role, content, nodes }) {
    state[chainType].messages.push({ role, content, nodes });
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
};

export const actions = {
  makeAiRequest({ commit, state, rootGetters }, { chainType, message }) {
    const projectAndWorkflowIds = rootGetters["workflow/projectAndWorkflowIds"];
    const nodeId = rootGetters["selection/singleSelectedNode"];

    commit("setIsProcessing", { chainType, isProcessing: true });
    commit("setProjectAndWorkflowIds", { chainType, projectAndWorkflowIds });
    commit("pushMessage", { chainType, role: "user", content: message });

    const messages = state[chainType].messages.map(({ role, content }) => ({
      role,
      content,
    }));

    const { projectId, workflowId } = projectAndWorkflowIds;
    API.desktop.makeAiRequest({
      chainType,
      projectId,
      workflowId,
      nodeId,
      messages,
    });
  },
  handleAiAssistantEvent({ commit }, { chainType, data: { type, payload } }) {
    switch (type) {
      case "result":
        if (payload.message) {
          commit("pushMessage", {
            chainType,
            role: "assistant",
            content: payload.message,
            nodes: payload.nodes,
          });
        }
        commit("setIsProcessing", { chainType, isProcessing: false });
        commit("setProjectAndWorkflowIds", {
          chainType,
          projectAndWorkflowIds: null,
        });
        break;
      case "error":
        commit("pushMessage", {
          chainType,
          role: "assistant",
          content: payload.message,
          isError: true,
        });
        commit("setIsProcessing", { chainType, isProcessing: false });
        commit("setProjectAndWorkflowIds", {
          chainType,
          projectAndWorkflowIds: null,
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
  abortAiRequest(_, { chainType }) {
    API.desktop.abortAiRequest({ chainType });
  },
};

export const getters = {};
