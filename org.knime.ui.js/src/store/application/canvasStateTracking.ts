import { defineStore } from "pinia";

import { useWorkflowStore } from "@/store/workflow/workflow";
import { encodeString } from "@/util/encodeString";
import { useCurrentCanvasStore } from "../canvas/useCurrentCanvasStore";

const getCanvasStateKey = (input: string) => encodeString(input);

export type CanvasPosition = {
  project: string;
  workflow: string;
  // svg values
  scrollLeft?: number;
  scrollTop?: number;
  scrollWidth?: number;
  scrollHeight?: number;
  // webgl values
  offsetX?: number;
  offsetY?: number;
  zoomFactor: number;
};

type RootWorkflowCanvasSnapshot = Partial<CanvasPosition> & {
  children: Record<string, CanvasPosition>;
  lastActive?: string;
};

type CanvasStateTrackingState = {
  savedCanvasStates: Record<string, RootWorkflowCanvasSnapshot>;
};

export const useCanvasStateTrackingStore = defineStore("canvasStateTracking", {
  state: (): CanvasStateTrackingState => ({
    savedCanvasStates: {},
  }),
  actions: {
    setSavedCanvasStates(newStates: CanvasPosition) {
      const { workflow, project } = newStates;
      const rootWorkflowId = "root";
      const isRootWorkflow = rootWorkflowId === workflow;
      const emptyParentState = { children: {} };

      if (isRootWorkflow) {
        const newStateKey = getCanvasStateKey(`${project}--${workflow}`);
        // get a reference of an existing parent state or create new one
        const parentState: RootWorkflowCanvasSnapshot =
          this.savedCanvasStates[newStateKey] || emptyParentState;

        parentState.lastActive = workflow;

        this.savedCanvasStates[newStateKey] = {
          ...parentState,
          ...newStates,
        };
      } else {
        const parentStateKey = getCanvasStateKey(
          `${project}--${rootWorkflowId}`,
        );
        const newStateKey = getCanvasStateKey(`${workflow}`);
        // in case we directly access a child the parent would not exist, so we default to an empty one
        const parentState =
          this.savedCanvasStates[parentStateKey] || emptyParentState;

        this.savedCanvasStates[parentStateKey] = {
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

    saveCanvasState() {
      const { projectId, workflowId } =
        useWorkflowStore().getProjectAndWorkflowIds;
      const scrollState = useCurrentCanvasStore().value.getCanvasScrollState;
      this.setSavedCanvasStates({
        ...scrollState,
        project: projectId,
        workflow: workflowId,
      });
    },

    async restoreCanvasState() {
      if (!this.workflowCanvasState) {
        return false;
      }
      await useCurrentCanvasStore().value.restoreScrollState(
        this.workflowCanvasState,
      );
      return true;
    },

    removeCanvasState(projectId: string) {
      const stateKey = getCanvasStateKey(`${projectId}--root`);
      delete this.savedCanvasStates[stateKey];
    },
  },
  getters: {
    workflowCanvasState: (state) => {
      if (!useWorkflowStore().activeWorkflow) {
        return null;
      }

      const { projectId, workflowId } =
        useWorkflowStore().getProjectAndWorkflowIds;
      const rootWorkflowId = "root";
      const isRootWorkflow = rootWorkflowId === workflowId;
      const parentStateKey = getCanvasStateKey(
        `${projectId}--${rootWorkflowId}`,
      );

      if (isRootWorkflow) {
        // read parent state
        return state.savedCanvasStates[parentStateKey];
      } else {
        // read child state
        const savedStateKey = getCanvasStateKey(workflowId);

        return state.savedCanvasStates[parentStateKey]?.children[savedStateKey];
      }
    },

    getCanvasStateById:
      (state) =>
      (projectId: string, workflowId: string = "root") => {
        const stateKey = getCanvasStateKey(`${projectId}--${workflowId}`);

        return state.savedCanvasStates[stateKey] || null;
      },
  },
});
