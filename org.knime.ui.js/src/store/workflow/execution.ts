import type { ActionTree, GetterTree } from "vuex";

import { API } from "@/api";
import {
  buildMiddleware,
  validateNodeExecuted,
  validatePortSupport,
} from "@/components/uiExtensions/common/output-validator";
import { getToastsProvider } from "@/plugins/toasts";
import { getPortViewByViewDescriptors } from "@/util/getPortViewByViewDescriptors";
import type { RootStoreState } from "../types";

import type { WorkflowState } from ".";
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
    }: { action: ExecutionAction; nodes: Array<string> | "all" | "selected" },
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
        "'nodes' has to be of type 'all' | 'selected' | Array<nodeId>]",
      );
    }
  },

  changeLoopState(
    { state },
    { action, nodeId }: { action: LoopStateAction; nodeId: string },
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

  openLegacyPortView({ state }, { nodeId, portIndex, executeNode = false }) {
    API.desktop.openLegacyPortView({
      projectId: state.activeWorkflow!.projectId,
      nodeId,
      portIdx: portIndex,
      executeNode,
    });
  },

  executeNodeAndOpenView({ state }, nodeId) {
    API.desktop.executeNodeAndOpenView({
      projectId: state.activeWorkflow!.projectId,
      nodeId,
    });
  },

  openPortView({ dispatch, rootState }, { node, port }) {
    if (port === "view") {
      dispatch("executeNodeAndOpenView", node.id);
      return;
    }

    const portTypes = rootState.application.availablePortTypes;
    const selectedPortIndex = Number(port);
    const selectedPort = node.outPorts[selectedPortIndex];
    const validationResult = buildMiddleware(
      validateNodeExecuted,
      validatePortSupport,
    )({
      selectedNode: node,
      selectedPort,
      selectedPortIndex,
      portTypes,
    })();

    const PORT_DETACH_SHORTCUT_FAILED_ID = "__PORT_DETACH_SHORTCUT_FAILED";
    const showDetachErrorToast = (message: string) => {
      getToastsProvider().show({
        id: PORT_DETACH_SHORTCUT_FAILED_ID,
        headline: "Error detaching output port view",
        message,
        type: "error",
      });
    };

    if (validationResult?.error?.code === "UNSUPPORTED_PORT_VIEW") {
      dispatch("openLegacyPortView", {
        nodeId: node.id,
        portIndex: selectedPortIndex,
      });
      return;
    }

    if (validationResult?.error) {
      showDetachErrorToast(
        validationResult.error.message ||
          "Please check the output port view for details",
      );
      return;
    }

    const portViews =
      rootState.application.availablePortTypes[
        node.outPorts[selectedPortIndex].typeId
      ].views;

    if (!portViews) {
      return;
    }

    const firstDetachableView = getPortViewByViewDescriptors(
      portViews,
      node,
      selectedPortIndex,
    ).find((v) => v.canDetach);

    if (firstDetachableView) {
      API.desktop.openPortView({
        projectId: rootState.application.activeProjectId!,
        nodeId: node.id,
        viewIndex: Number(firstDetachableView.id),
        portIndex: selectedPortIndex,
      });
    } else {
      showDetachErrorToast("Port has no detachable view");
    }
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
