import type { ActionTree, GetterTree } from "vuex";

import { API } from "@api";

import type { WorkflowState } from ".";
import type { RootStoreState } from "../types";
import { getProjectAndWorkflowIds } from "./util";

/**
 * This store is not instantiated by Nuxt but merged with the workflow store.
 * It holds all calls from the workflow store to the API regarding execution.
 */

export const state = () => ({});
export const mutations = {};

type ExecutionAction = Parameters<
  typeof API.node.changeNodeStates
>[0]["action"];
type LoopStateAction = Parameters<typeof API.node.changeLoopState>[0]["action"];

export const actions: ActionTree<WorkflowState, RootStoreState> = {
  changeNodeState(
    { state, rootGetters },
    {
      action,
      nodes,
    }: { action: ExecutionAction; nodes: Array<string> | "all" | "selected" }
  ) {
    const { projectId, workflowId } = getProjectAndWorkflowIds(state);

    if (Array.isArray(nodes)) {
      // act upon a list of nodes
      return API.node.changeNodeStates({
        projectId,
        nodeIds: nodes,
        action,
        workflowId,
      });
    } else if (nodes === "all") {
      // act upon entire workflow
      return API.node.changeNodeStates({
        projectId,
        action,
        nodeIds: [],
        workflowId,
      });
    } else if (nodes === "selected") {
      // act upon selected nodes
      return API.node.changeNodeStates({
        projectId,
        nodeIds: rootGetters["selection/selectedNodeIds"],
        action,
        workflowId,
      });
    } else {
      throw new TypeError(
        "'nodes' has to be of type 'all' | 'selected' | Array<nodeId>]"
      );
    }
  },

  changeLoopState(
    { state },
    { action, nodeId }: { action: LoopStateAction; nodeId: string }
  ) {
    const { projectId, workflowId } = getProjectAndWorkflowIds(state);

    return API.node.changeLoopState({
      projectId,
      workflowId,
      nodeId,
      action,
    });
  },

  executeNodes({ dispatch }, nodes) {
    return dispatch("changeNodeState", { action: "execute", nodes });
  },

  executeNodeAndOpenView({ state }, nodeId) {
    API.desktop.executeNodeAndOpenView({
      projectId: state.activeWorkflow.projectId,
      nodeId,
    });
  },

  resetNodes({ dispatch }, nodes) {
    return dispatch("changeNodeState", { action: "reset", nodes });
  },

  cancelNodeExecution({ dispatch }, nodes) {
    return dispatch("changeNodeState", { action: "cancel", nodes });
  },

  /* See docs in API */
  pauseLoopExecution({ dispatch }, nodeId) {
    return dispatch("changeLoopState", { action: "pause", nodeId });
  },

  /* See docs in API */
  resumeLoopExecution({ dispatch }, nodeId) {
    return dispatch("changeLoopState", { action: "resume", nodeId });
  },

  /* See docs in API */
  stepLoopExecution({ dispatch }, nodeId) {
    return dispatch("changeLoopState", { action: "step", nodeId });
  },
};

export const getters: GetterTree<WorkflowState, RootStoreState> = {};
