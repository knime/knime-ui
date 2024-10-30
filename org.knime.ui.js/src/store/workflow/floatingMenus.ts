import type { ActionTree, GetterTree, MutationTree } from "vuex";

import type { NodePort, PortGroup, XY } from "@/api/gateway-api/generated-api";
import type { QuickActionMenuProps } from "@/components/workflow/quickActionMenu/QuickActionMenu.vue";
import type { RootStoreState } from "../types";

import type { WorkflowState } from ".";

interface State {
  portTypeMenu: {
    isOpen: boolean;
    nodeId: string | null;
    startNodeId: string | null;
    previewPort: NodePort | { typeId: string } | null;
    // TODO: improve typing by exporting Props from PortTypeMenu component
    // not needed right now because the Vue <-> Vuex type integration is not the best anyway.
    props: {
      position: XY;
      side: "input" | "output";
      portGroups: Record<string, PortGroup>;
    } | null;

    events: {
      itemActive?: () => void;
      itemClick?: () => void;
      menuClose?: () => void;
    };
  };

  quickActionMenu: {
    isOpen: boolean;
    isLocked: boolean;
    props: QuickActionMenuProps | null;
    events: {
      menuClose?: () => void;
    };
  };
}

declare module "./index" {
  interface WorkflowState extends State {}
}

export const state = (): State => ({
  portTypeMenu: {
    isOpen: false,
    nodeId: null,
    startNodeId: null,
    previewPort: null,
    props: null,
    events: {},
  },

  quickActionMenu: {
    isOpen: false,
    isLocked: false,
    props: null,
    events: {},
  },
});

export const mutations: MutationTree<WorkflowState> = {
  setPortTypeMenu(state, value) {
    state.portTypeMenu = value;
  },

  setQuickActionMenu(state, value) {
    state.quickActionMenu = value;
  },

  setPortTypeMenuPreviewPort(state, previewPort) {
    state.portTypeMenu = { ...state.portTypeMenu, previewPort };
  },
};

export const actions: ActionTree<WorkflowState, RootStoreState> = {
  openPortTypeMenu({ commit }, { nodeId, startNodeId, props, events }) {
    commit("setPortTypeMenu", {
      isOpen: true,
      previewPort: null,
      nodeId,
      startNodeId,
      props,
      events,
    });
  },

  closePortTypeMenu({ commit, dispatch }) {
    commit("setPortTypeMenu", {
      isOpen: false,
      nodeId: null,
      previewPort: null,
      props: {},
      events: {},
    });
    dispatch("canvas/focus", null, { root: true });
  },

  openQuickActionMenu({ commit, dispatch }, { props, events }) {
    commit("setQuickActionMenu", {
      isOpen: true,
      isLocked: false,
      props,
      events: events
        ? events
        : { menuClose: () => dispatch("closeQuickActionMenu") },
    });
  },

  async closeQuickActionMenu({ state, commit, dispatch }, { force = false } = {}) {
    if (state.quickActionMenu.isLocked && !force) {
      return;
    }

    commit("setQuickActionMenu", {
      isOpen: false,
      isLocked: false,
      props: {},
      events: {},
    });

    await dispatch("canvas/focus", null, { root: true });
  },

  lockQuickActionMenu({ state, commit }) {
    commit("setQuickActionMenu", {
      ...state.quickActionMenu,
      isLocked: true,
    });
  },

  unlockQuickActionMenu({ state, commit }) {
    commit("setQuickActionMenu", {
      ...state.quickActionMenu,
      isLocked: false,
    });
  },
};

export const getters: GetterTree<WorkflowState, RootStoreState> = {};
