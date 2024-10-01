import type { ActionTree, GetterTree, MutationTree } from "vuex";

import { API } from "@/api";

import type { RootStoreState } from "../types";
import type { WorkflowState } from "./index";
import { getProjectAndWorkflowIds } from "./util";
import type { XY } from "@/api/gateway-api/generated-api";

type ConnectionID = string;
type BendpointIndex = number;

interface State {
  virtualBendpoints: Record<
    ConnectionID,
    Record<BendpointIndex, XY & { currentBendpointCount: number }>
  >;
}

declare module "./index" {
  interface WorkflowState extends State {}
}

export const state = (): State => ({
  virtualBendpoints: {},
});

export const mutations: MutationTree<WorkflowState> = {
  updateConnection(state, { connectionId, data }) {
    state.activeWorkflow!.connections[connectionId] = data;
  },

  addVirtualBendpoint(state, { connectionId, index, position }) {
    const currentBendpointCount =
      state.activeWorkflow!.connections[connectionId].bendpoints?.length ?? 0;

    state.virtualBendpoints = {
      ...state.virtualBendpoints,
      [connectionId]: {
        ...state.virtualBendpoints[connectionId],
        [index]: { ...position, currentBendpointCount },
      },
    };
  },

  removeVirtualBendpoint(state, { connectionId, index }) {
    delete state.virtualBendpoints[connectionId][index];

    if (Object.keys(state.virtualBendpoints[connectionId]).length === 0) {
      delete state.virtualBendpoints[connectionId];
    }
  },
};

export const actions: ActionTree<WorkflowState, RootStoreState> = {
  addVirtualBendpoint({ commit }, { position, connectionId, index }) {
    commit("addVirtualBendpoint", {
      connectionId,
      position,
      index,
    });
  },

  async addBendpoint(
    { state, commit, dispatch },
    { connectionId, index, position },
  ) {
    const { projectId, workflowId } = getProjectAndWorkflowIds(state);

    await API.workflowCommand.AddBendpoint({
      projectId,
      workflowId,
      connectionId,
      position: {
        x: position.x,
        y: position.y,
      },
      index,
    });

    // move new bendpoint
    await dispatch("moveObjects");

    commit("removeVirtualBendpoint", { connectionId, index });
  },
};

export const getters: GetterTree<WorkflowState, RootStoreState> = {};
