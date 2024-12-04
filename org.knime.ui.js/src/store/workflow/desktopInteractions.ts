import type { ActionTree, GetterTree } from "vuex";

import { API } from "@/api";
import type { RootStoreState } from "../types";

import type { WorkflowState } from "./index";
import { getNextProjectId, getProjectAndWorkflowIds } from "./util";

/**
 * This store is merged with the workflow store.
 * It holds all calls from the workflow store to the local Analytics Platform.
 */
export const state = () => ({});

export const mutations = {};

export const actions: ActionTree<WorkflowState, RootStoreState> = {
  /* See docs in API */
  async saveProject({ state, dispatch }) {
    const { projectId } = getProjectAndWorkflowIds(state);

    const workflowPreviewSvg = await dispatch(
      "application/getActiveWorkflowSnapshot",
      null,
      { root: true },
    );

    await API.desktop.saveProject({ projectId, workflowPreviewSvg });
  },

  /* Tell the backend to unload this project from memory */
  async closeProject({ dispatch, rootState }, closingProjectId) {
    const { openProjects, activeProjectId } = rootState.application;
    const nextProjectId = getNextProjectId({
      openProjects,
      activeProjectId,
      closingProjectIds: [closingProjectId],
    });

    const canContinue = await dispatch(
      "nodeConfiguration/autoApplySettings",
      { nextNodeId: null },
      { root: true },
    );

    if (!canContinue) {
      return;
    }

    const didClose = await API.desktop.closeProject({
      closingProjectId,
      nextProjectId,
    });

    if (!didClose) {
      return;
    }

    await dispatch("clearProcessedUpdateNotification", {
      projectId: closingProjectId,
    });

    await dispatch("application/removeCanvasState", closingProjectId, {
      root: true,
    });
    await dispatch(
      "application/removeFromRootWorkflowSnapshots",
      { projectId: closingProjectId },
      { root: true },
    );
  },

  /* Some nodes generate views from their data. The node gets executed and a Classic UI dialog opens to present this view */
  executeNodeAndOpenView({ state }, nodeId) {
    API.desktop.executeNodeAndOpenView({
      projectId: state.activeWorkflow!.projectId,
      nodeId,
    });
  },

  /* See docs in API */
  async openNodeConfiguration({ state, rootGetters, commit }, nodeId) {
    const settingsChanged = await API.desktop.openNodeDialog({
      projectId: state.activeWorkflow!.projectId,
      nodeId,
    });

    // after dialog is closed, check if the node was selected and rerender port views
    const selectedNode = rootGetters["selection/singleSelectedNode"];
    if (settingsChanged && selectedNode) {
      commit("nodeConfiguration/setTimestamp", Date.now(), { root: true });
    }
  },

  /* See docs in API */
  openFlowVariableConfiguration({ state }, nodeId) {
    API.desktop.openLegacyFlowVariableDialog({
      projectId: state.activeWorkflow!.projectId,
      nodeId,
    });
  },

  /* See docs in API */
  openLayoutEditor({ state }) {
    const { projectId, workflowId } = getProjectAndWorkflowIds(state);

    API.desktop.openLayoutEditor({ projectId, workflowId });
  },

  /* See docs in API */
  openLayoutEditorByNodeId({ state }, { nodeId }) {
    const { projectId } = getProjectAndWorkflowIds(state);

    API.desktop.openLayoutEditor({ projectId, workflowId: nodeId });
  },

  async saveProjectAs({ state, dispatch, rootState }) {
    const { projectId } = getProjectAndWorkflowIds(state);

    const workflowPreviewSvg = await dispatch(
      "application/getActiveWorkflowSnapshot",
      null,
      { root: true },
    );

    await API.desktop.saveProjectAs({ projectId, workflowPreviewSvg });
    // refresh space after save workflow
    dispatch(
      "spaces/fetchWorkflowGroupContent",
      { projectId: rootState.application.activeProjectId },
      { root: true },
    );
  },
};

export const getters: GetterTree<WorkflowState, RootStoreState> = {};
