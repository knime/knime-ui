import type { ActionTree, GetterTree, MutationTree } from "vuex";

import { API } from "@api";
import type { XY } from "@/api/gateway-api/generated-api";

import type { RootStoreState } from "../types";
import type { WorkflowState } from "./index";
import { getProjectAndWorkflowIds } from "./util";

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
  async moveObjects({ state, commit, rootGetters, dispatch }) {
    const { projectId, workflowId } = getProjectAndWorkflowIds(state);
    const selectedNodes = rootGetters["selection/selectedNodeIds"];
    const selectedAnnotations = rootGetters["selection/selectedAnnotationIds"];

    const translation = {
      x: state.movePreviewDelta.x,
      y: state.movePreviewDelta.y,
    };

    if (translation.x === 0 && translation.y === 0) {
      await dispatch("resetDragState");
      return;
    }

    if (rootGetters["selection/selectedBendpoints"].length > 0) {
      dispatch("moveBendpoints");
    }

    try {
      await API.workflowCommand.Translate({
        projectId,
        workflowId,
        nodeIds: selectedNodes,
        annotationIds: selectedAnnotations,
        translation,
      });
    } catch (e) {
      consola.log("The following error occured: ", e);
      commit("resetMovePreview");
    }
  },

  async moveBendpoints({ state, dispatch, rootGetters }) {
    const translation = {
      x: state.movePreviewDelta.x,
      y: state.movePreviewDelta.y,
    };

    if (translation.x === 0 && translation.y === 0) {
      await dispatch("resetDragState");
      return;
    }

    const selectedBendpoints: Array<{ connectionId: string; index: number }> =
      rootGetters["selection/selectedBendpoints"];

    // simulate command call, making it async by adding a certain delay
    // eslint-disable-next-line no-magic-numbers
    await new Promise((r) => setTimeout(r, 0));
    selectedBendpoints.forEach(({ connectionId, index }) => {
      // const bendpoints = selectedBendpoints[connectionId];
      const { bendpoints: currentBendpoints } =
        state.activeWorkflow.connections[connectionId];

      const updatedBendpoints = currentBendpoints.map((coords, _index) =>
        Number(index) === _index
          ? {
              x: coords.x + translation.x,
              y: coords.y + translation.y,
            }
          : coords,
      );

      state.activeWorkflow.connections[connectionId] = {
        ...state.activeWorkflow.connections[connectionId],
        bendpoints: updatedBendpoints,
      };
    });
  },
};

export const getters: GetterTree<WorkflowState, RootStoreState> = {};
