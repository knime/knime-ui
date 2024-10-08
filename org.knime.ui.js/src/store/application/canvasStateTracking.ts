import type { ActionTree, GetterTree, MutationTree } from "vuex";

import { encodeString } from "@/util/encodeString";
import type { RootStoreState } from "../types";

import type { ApplicationState } from ".";

const getCanvasStateKey = (input: string) => encodeString(input);

interface CanvasPosition {
  project: string;
  workflow: string;
  scrollLeft: number;
  scrollTop: number;
  scrollWidth: number;
  scrollHeight: number;
  zoomFactor: number;
}

interface RootWorkflowCanvasSnapshot extends Partial<CanvasPosition> {
  children: Record<string, CanvasPosition>;
  lastActive?: string;
}

interface State {
  savedCanvasStates: Record<string, RootWorkflowCanvasSnapshot>;
}

declare module "./index" {
  interface ApplicationState extends State {}
}

export const state = (): State => ({
  savedCanvasStates: {},
});

export const mutations: MutationTree<ApplicationState> = {
  setSavedCanvasStates(state, newStates: CanvasPosition) {
    const { savedCanvasStates } = state;
    const { workflow, project } = newStates;
    const rootWorkflowId = "root";
    const isRootWorkflow = rootWorkflowId === workflow;
    const emptyParentState = { children: {} };

    if (isRootWorkflow) {
      const newStateKey = getCanvasStateKey(`${project}--${workflow}`);
      // get a reference of an existing parent state or create new one
      const parentState: RootWorkflowCanvasSnapshot =
        savedCanvasStates[newStateKey] || emptyParentState;

      parentState.lastActive = workflow;

      state.savedCanvasStates[newStateKey] = {
        ...parentState,
        ...newStates,
      };
    } else {
      const parentStateKey = getCanvasStateKey(`${project}--${rootWorkflowId}`);
      const newStateKey = getCanvasStateKey(`${workflow}`);
      // in case we directly access a child the parent would not exist, so we default to an empty one
      const parentState = savedCanvasStates[parentStateKey] || emptyParentState;

      state.savedCanvasStates[parentStateKey] = {
        // keep the parent state
        ...parentState,
        lastActive: workflow,
        children: {
          // update the children with the newStates
          ...parentState.children,
          [newStateKey]: newStates,
        },
      };
    }
  },
};

export const actions: ActionTree<ApplicationState, RootStoreState> = {
  saveCanvasState({ rootGetters, commit }) {
    const { projectId, workflowId } =
      rootGetters["workflow/projectAndWorkflowIds"];

    const scrollState = rootGetters["canvas/getCanvasScrollState"]();
    commit("setSavedCanvasStates", {
      ...scrollState,
      project: projectId,
      workflow: workflowId,
    });
  },

  async restoreCanvasState({ dispatch, getters }) {
    const { workflowCanvasState } = getters;
    if (workflowCanvasState) {
      await dispatch("canvas/restoreScrollState", workflowCanvasState, {
        root: true,
      });
    }
  },

  removeCanvasState({ state }, projectId) {
    const stateKey = getCanvasStateKey(`${projectId}--root`);
    delete state.savedCanvasStates[stateKey];
  },
};

export const getters: GetterTree<ApplicationState, RootStoreState> = {
  workflowCanvasState({ savedCanvasStates }, _, { workflow }, rootGetters) {
    if (!workflow.activeWorkflow) {
      return null;
    }

    const { projectId, workflowId } =
      rootGetters["workflow/projectAndWorkflowIds"];

    const rootWorkflowId = "root";
    const isRootWorkflow = rootWorkflowId === workflowId;
    const parentStateKey = getCanvasStateKey(`${projectId}--${rootWorkflowId}`);

    if (isRootWorkflow) {
      // read parent state
      return savedCanvasStates[parentStateKey];
    } else {
      // read child state
      const savedStateKey = getCanvasStateKey(workflowId);
      return savedCanvasStates[parentStateKey]?.children[savedStateKey];
    }
  },

  getCanvasStateById(state) {
    return (projectId: string, workflowId: string = "root") => {
      const stateKey = getCanvasStateKey(`${projectId}--${workflowId}`);
      return state.savedCanvasStates[stateKey] || null;
    };
  },
};
