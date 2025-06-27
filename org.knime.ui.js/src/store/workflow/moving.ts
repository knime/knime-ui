/* eslint-disable no-undefined */
import { API } from "@api";
import { defineStore } from "pinia";

import type { KnimeNode } from "@/api/custom-types";
import type { WorkflowAnnotation, XY } from "@/api/gateway-api/generated-api";
import { useSelectionStore } from "@/store/selection";

import { useWorkflowStore } from "./workflow";

type MovingState = {
  isDragging: boolean;
  hasAbortedDrag: boolean;
  movePreviewDelta: XY;
  dragInitiatorId: string | undefined;
  /**
   * A drag interaction always makes a selection of the object being dragged, this
   * selection happens immediately as soon as the drag interaction starts.
   * However, in some cases we want to delay this selection so that it's considered
   * "done" only after the drag interaction ends. One such case is when loading
   * node/port views, which can be heavy since it loads and renders an iframe whose
   * content could slow down the main thread thus making the drag interaction sluggish.
   */
  isSelectionDelayedUntilDragCompletes: boolean;
};

export const useMovingStore = defineStore("moving", {
  state: (): MovingState => ({
    isDragging: false,
    hasAbortedDrag: false,
    movePreviewDelta: { x: 0, y: 0 },
    dragInitiatorId: undefined,
    isSelectionDelayedUntilDragCompletes: false,
  }),
  actions: {
    // Shifts the position of the node for the provided amount
    setMovePreview({ deltaX, deltaY }: { deltaX: number; deltaY: number }) {
      this.movePreviewDelta.x = deltaX;
      this.movePreviewDelta.y = deltaY;
    },

    // Reset the position of the move deltas
    resetMovePreview() {
      this.movePreviewDelta = { x: 0, y: 0 };
    },

    setHasAbortedDrag(hasAbortedDrag: boolean) {
      this.hasAbortedDrag = hasAbortedDrag;
    },

    setIsDragging(isDragging: boolean) {
      this.isDragging = isDragging;
    },

    abortDrag() {
      this.setHasAbortedDrag(true);
      this.resetDragState();
    },

    resetAbortDrag() {
      this.setHasAbortedDrag(false);
    },

    resetDragState() {
      this.dragInitiatorId = undefined;
      this.setMovePreview({ deltaX: 0, deltaY: 0 });
      this.setIsDragging(false);
    },
    /**
     * Calls the API to save the position of the nodes after the move is over
     */
    async moveObjects() {
      const selectionStore = useSelectionStore();
      const { projectId, workflowId } =
        useWorkflowStore().getProjectAndWorkflowIds;
      const selectedNodeIds = selectionStore.selectedNodeIds;
      const selectedAnnotationIds = selectionStore.selectedAnnotationIds;
      const connectionBendpoints = selectionStore.getSelectedBendpoints;
      const metanodePortBars = selectionStore.getSelectedMetanodePortBars;

      const translation = {
        x: this.movePreviewDelta.x,
        y: this.movePreviewDelta.y,
      };

      if (translation.x === 0 && translation.y === 0) {
        this.resetDragState();
        return;
      }

      // do optimistic updates
      const selectedNodes = selectionStore.getSelectedNodes;
      selectedNodes.forEach((node: KnimeNode) => {
        node.position.x += translation.x;
        node.position.y += translation.y;
      });

      const selectedAnnotations = selectionStore.getSelectedAnnotations;
      selectedAnnotations.forEach((annotation: WorkflowAnnotation) => {
        annotation.bounds.x += translation.x;
        annotation.bounds.y += translation.y;
      });

      if (metanodePortBars.includes("in")) {
        const metaInBounds =
          useWorkflowStore().activeWorkflow?.metaInPorts?.bounds;
        if (!metaInBounds) {
          return;
        }
        metaInBounds.x += translation.x;
        metaInBounds.y += translation.y;
      }

      if (metanodePortBars.includes("out")) {
        const metaOutBounds =
          useWorkflowStore().activeWorkflow?.metaOutPorts?.bounds;
        if (!metaOutBounds) {
          return;
        }
        metaOutBounds.x += translation.x;
        metaOutBounds.y += translation.y;
      }

      Object.keys(connectionBendpoints).forEach((connectionId: string) => {
        connectionBendpoints[connectionId].forEach((selectedIndex: number) => {
          const connection =
            useWorkflowStore()?.activeWorkflow?.connections[connectionId];
          const bendpoint = connection?.bendpoints?.[selectedIndex];

          if (!bendpoint) {
            return;
          }
          bendpoint.x += translation.x;
          bendpoint.y += translation.y;
        });
      });

      // reset drag state
      this.resetDragState();

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
  },
});
