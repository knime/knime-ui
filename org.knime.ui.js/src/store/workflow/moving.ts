import type { ActionTree, GetterTree, MutationTree } from "vuex";

import { API } from "@api";
import type { WorkflowAnnotation, XY } from "@/api/gateway-api/generated-api";

import type { RootStoreState } from "../types";
import type { WorkflowState } from "./index";
import { getProjectAndWorkflowIds } from "./util";
import type { KnimeNode } from "@/api/custom-types";

interface State {
  isDragging: boolean;
  hasAbortedDrag: boolean;
  movePreviewDelta: XY;
}

declare module "./index" {
  interface WorkflowState extends State {}
}

export const state = (): State => ({
  isDragging: false,
  hasAbortedDrag: false,
  // TODO: rename to `translationDelta`
  movePreviewDelta: { x: 0, y: 0 },
});

export const mutations: MutationTree<WorkflowState> = {
  // Shifts the position of the node for the provided amount
  setMovePreview(state, { deltaX, deltaY }) {
    state.movePreviewDelta.x = deltaX;
    state.movePreviewDelta.y = deltaY;
  },

  // Reset the position of the move deltas
  resetMovePreview(state) {
    state.movePreviewDelta = { x: 0, y: 0 };
  },

  setHasAbortedDrag(state, value) {
    state.hasAbortedDrag = value;
  },

  setIsDragging(state, value) {
    state.isDragging = value;
  },
};

export const actions: ActionTree<WorkflowState, RootStoreState> = {
  abortDrag({ commit }) {
    commit("setHasAbortedDrag", true);
    commit("setMovePreview", { deltaX: 0, deltaY: 0 });
    commit("setIsDragging", false);
  },

  resetAbortDrag({ commit }) {
    commit("setHasAbortedDrag", false);
  },

  resetDragState({ commit }) {
    commit("setMovePreview", { deltaX: 0, deltaY: 0 });
    commit("setIsDragging", false);
  },
  /**
   * Calls the API to save the position of the nodes after the move is over
   */
  async moveObjects({ state, rootGetters, rootState, dispatch }) {
    const { projectId, workflowId } = getProjectAndWorkflowIds(state);
    const selectedNodeIds = rootGetters["selection/selectedNodeIds"];
    const selectedAnnotationIds =
      rootGetters["selection/selectedAnnotationIds"];
    const connectionBendpoints = rootGetters["selection/selectedBendpoints"];
    const metanodePortBars = rootGetters["selection/selectedMetanodePortBars"];

    const translation = {
      x: state.movePreviewDelta.x,
      y: state.movePreviewDelta.y,
    };

    if (translation.x === 0 && translation.y === 0) {
      await dispatch("resetDragState");
      return;
    }

    // do optimistic updates
    const selectedNodes = rootGetters["selection/selectedNodes"];
    selectedNodes.forEach((node: KnimeNode) => {
      node.position.x += translation.x;
      node.position.y += translation.y;
    });

    const selectedAnnotations = rootGetters["selection/selectedAnnotations"];
    selectedAnnotations.forEach((annotation: WorkflowAnnotation) => {
      annotation.bounds.x += translation.x;
      annotation.bounds.y += translation.y;
    });

    if (metanodePortBars.includes("in")) {
      const metaInBounds =
        rootState.workflow.activeWorkflow?.metaInPorts?.bounds;
      if (!metaInBounds) {
        return;
      }
      metaInBounds.x += translation.x;
      metaInBounds.y += translation.y;
    }

    if (metanodePortBars.includes("out")) {
      const metaOutBounds =
        rootState.workflow.activeWorkflow?.metaOutPorts?.bounds;
      if (!metaOutBounds) {
        return;
      }
      metaOutBounds.x += translation.x;
      metaOutBounds.y += translation.y;
    }

    Object.keys(connectionBendpoints).forEach((connectionId: string) => {
      connectionBendpoints[connectionId].forEach((selectedIndex: number) => {
        const connection =
          rootState.workflow?.activeWorkflow?.connections[connectionId];
        const bendpoint = connection?.bendpoints?.[selectedIndex];

        if (!bendpoint) {
          return;
        }
        bendpoint.x += translation.x;
        bendpoint.y += translation.y;
      });
    });

    // reset drag state
    await dispatch("resetDragState");

    // send data to backend
    try {
      await API.workflowCommand.Translate({
        projectId,
        workflowId,
        nodeIds: selectedNodeIds,
        annotationIds: selectedAnnotationIds,
        connectionBendpoints,
        metanodeInPortsBar: metanodePortBars.includes("in"),
        metanodeOutPortsBar: metanodePortBars.includes("out"),
        translation,
      });
    } catch (e) {
      consola.log("The following error occurred: ", e);
    }
  },
};

export const getters: GetterTree<WorkflowState, RootStoreState> = {};
