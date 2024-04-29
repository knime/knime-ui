/**
 * Store that manages the global state of the side-panel (tabs plus expanding drawer).
 */

import type { ActionTree, GetterTree, MutationTree } from "vuex";
import type { RootStoreState } from "./types";

export const TABS = {
  CONTEXT_AWARE_DESCRIPTION: "description",
  NODE_REPOSITORY: "nodeRepository",
  NODE_DIALOG: "nodeDialog",
  SPACE_EXPLORER: "spaceExplorer",
  KAI: "kai",
  WORKFLOW_MONITOR: "workflowMonitor",
} as const;

type TabKeys = keyof typeof TABS;
export type TabValues = (typeof TABS)[TabKeys];
export interface PanelState {
  expanded: boolean;
  activeTab: Record<string, TabValues>;
  isExtensionPanelOpen: boolean;
}

export const state = (): PanelState => ({
  expanded: true,
  activeTab: {},
  isExtensionPanelOpen: false,
});

export const actions: ActionTree<PanelState, RootStoreState> = {
  setCurrentProjectActiveTab({ commit, rootState }, activeTab) {
    const projectId = rootState.application.activeProjectId;
    if (projectId === null) {
      return;
    }
    commit("setActiveTab", { projectId, activeTab });
  },

  openExtensionPanel({ commit }) {
    commit("setExtensionPanelOpen", true);
  },

  closeExtensionPanel({ commit }) {
    commit("setExtensionPanelOpen", false);
  },
};

export const mutations: MutationTree<PanelState> = {
  setActiveTab(state, { projectId, activeTab }) {
    state.activeTab = {
      ...state.activeTab,
      [projectId]: activeTab,
    };
    state.expanded = true;
  },
  toggleExpanded(state) {
    state.expanded = !state.expanded;
  },
  closePanel(state) {
    state.expanded = false;
  },
  setExtensionPanelOpen(state, val) {
    state.isExtensionPanelOpen = val;
  },
};

export const getters: GetterTree<PanelState, RootStoreState> = {
  isTabActive(state, _, rootState, rootGetters) {
    const isWorkflowEmpty = rootGetters["workflow/isWorkflowEmpty"];
    const { activeProjectId } = rootState.application;

    return (tabName: TabValues) => {
      const getDefaultTab = () => {
        return isWorkflowEmpty
          ? TABS.NODE_REPOSITORY
          : TABS.CONTEXT_AWARE_DESCRIPTION;
      };

      if (!activeProjectId) {
        return false;
      }

      const _activeTab = state.activeTab[activeProjectId] || getDefaultTab();

      return _activeTab === tabName;
    };
  },
};
