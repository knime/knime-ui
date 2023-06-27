import type { ActionTree, GetterTree, MutationTree } from "vuex";
import { encodeString } from "@/util/encodeString";
import type { RootStoreState } from "../types";
import type { ApplicationState } from "./index";

interface WorkflowPreviewSnapshot {
  isCanvasEmpty: boolean;
  svgElement: SVGSVGElement;
}

interface State {
  // Map that keeps track of root workflow snapshots. Used to generate SVGs when saving
  rootWorkflowSnapshots: Map<string, WorkflowPreviewSnapshot>;
}

declare module "./index" {
  interface ApplicationState extends State {}
}

export const state = (): State => ({
  rootWorkflowSnapshots: new Map(),
});

export const mutations: MutationTree<ApplicationState> = {};

export const actions: ActionTree<ApplicationState, RootStoreState> = {
  updatePreviewSnapshot(
    { rootState, state, dispatch },
    { isChangingProject, newWorkflow }
  ) {
    const isCurrentlyOnRoot =
      rootState.workflow?.activeWorkflow?.info.containerId === "root";
    const isWorkflowUnsaved = rootState.workflow?.activeWorkflow?.dirty;

    const { activeProjectId } = state;

    // Going from the root into deeper levels (e.g into a Metanode or Component)
    // without having changed projects
    const isEnteringSubWorkflow =
      isCurrentlyOnRoot && newWorkflow && !isChangingProject;

    if (isEnteringSubWorkflow || (isChangingProject && isWorkflowUnsaved)) {
      const canvasElement =
        rootState.canvas.getScrollContainerElement().firstChild;

      // save a snapshot of the current state of the root workflow
      dispatch("addToRootWorkflowSnapshots", {
        projectId: activeProjectId,
        element: canvasElement,
        isCanvasEmpty: rootState.canvas.isEmpty,
      });

      return;
    }

    // Going back to the root of a workflow without having changed projects
    const isGoingBackToRoot = newWorkflow?.workflowId === "root";
    if (!isCurrentlyOnRoot && isGoingBackToRoot && !isChangingProject) {
      // Since we're back in the root workflow, we can clear the previously saved snapshot
      dispatch("removeFromRootWorkflowSnapshots", {
        projectId: activeProjectId,
      });
    }
  },

  addToRootWorkflowSnapshots({ state }, { projectId, element, isCanvasEmpty }) {
    // always use the "root" workflow
    const snapshotKey = encodeString(`${projectId}--root`);
    state.rootWorkflowSnapshots.set(snapshotKey, {
      svgElement: element.cloneNode(true),
      isCanvasEmpty,
    });
  },

  removeFromRootWorkflowSnapshots({ state }, { projectId }) {
    state.rootWorkflowSnapshots.delete(encodeString(`${projectId}--root`));
  },

  getRootWorkflowSnapshotByProjectId({ state }, { projectId }) {
    const snapshotKey = encodeString(`${projectId}--root`);
    return state.rootWorkflowSnapshots.get(snapshotKey);
  },

  async getActiveWorkflowSnapshot({ rootState, dispatch }) {
    const { getScrollContainerElement, isEmpty } = rootState.canvas;
    const {
      activeWorkflow: {
        projectId,
        info: { containerId },
      },
    } = rootState.workflow;

    const isRootWorkflow = containerId === "root";

    const rootWorkflowSnapshot = isRootWorkflow
      ? {
          svgElement: getScrollContainerElement().firstChild,
          isCanvasEmpty: isEmpty,
        }
      : // when we're on a nested workflow (metanode/component) we then need to use the saved snapshot
        await dispatch("getRootWorkflowSnapshotByProjectId", { projectId });

    return rootWorkflowSnapshot;
  },
};

export const getters: GetterTree<ApplicationState, RootStoreState> = {};
