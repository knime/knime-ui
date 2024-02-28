import type { ActionTree, GetterTree, MutationTree } from "vuex";
import type { NodePort, PortGroup, XY } from "@/api/gateway-api/generated-api";
import type { WorkflowState } from ".";
import type { RootStoreState } from "../types";

interface State {
  portTypeMenu: {
    isOpen: boolean;
    nodeId: string | null;
    startNodeId: string | null;
    previewPort: NodePort | null;
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

  quickAddNodeMenu: {
    isOpen: boolean;
    props: {
      position: XY;
      nodeId?: string | null;
      port: NodePort | null;
    } | null;
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

  quickAddNodeMenu: {
    isOpen: false,
    props: null,
    events: {},
  },
});

export const mutations: MutationTree<WorkflowState> = {
  setPortTypeMenu(state, value) {
    state.portTypeMenu = value;
  },

  setQuickAddNodeMenu(state, value) {
    state.quickAddNodeMenu = value;
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

  closePortTypeMenu({ commit }) {
    commit("setPortTypeMenu", {
      isOpen: false,
      nodeId: null,
      previewPort: null,
      props: {},
      events: {},
    });
  },

  openQuickAddNodeMenu({ commit, dispatch }, { props, events }) {
    commit("setQuickAddNodeMenu", {
      isOpen: true,
      props,
      events: events
        ? events
        : { menuClose: () => dispatch("closeQuickAddNodeMenu") },
    });
  },

  closeQuickAddNodeMenu({ commit }) {
    commit("setQuickAddNodeMenu", {
      isOpen: false,
      props: {},
      events: {},
    });
  },
};

export const getters: GetterTree<WorkflowState, RootStoreState> = {};
