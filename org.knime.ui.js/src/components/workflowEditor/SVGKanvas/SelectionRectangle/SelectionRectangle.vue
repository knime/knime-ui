<script lang="ts">
import { defineComponent } from "vue";
import { mapActions, mapState, storeToRefs } from "pinia";
import throttle from "raf-throttle";

import type { XY } from "@/api/gateway-api/generated-api";
import { findObjectsForSelection } from "@/components/workflowEditor/util/findObjectsForSelection";
import { useSVGCanvasStore } from "@/store/canvas/canvas-svg";
import { useSelectionStore } from "@/store/selection";
import { useWorkflowStore } from "@/store/workflow/workflow";

type RectangleSelectionData = {
  startPos: XY;
  endPos: XY;
  pointerId: number | null;
  nodeIdsToSelectOnEnd: string[];
  nodeIdsToDeselectOnEnd: string[];
  selectedNodeIdsAtStart: string[];

  inverseMode: boolean;
  moved: boolean;

  annotationIdsToSelectOnEnd: string[];
  annotationIdsToDeselectOnEnd: string[];
  selectedAnnotationIdsAtStart: string[];
};

const MOVE_THRESHOLD = 5;
/**
 * SelectionRectangle - select multiple nodes by drawing a rectangle with by mouse (pointer) movement
 *
 * This component registers to the `selection-pointer{up,down,move} of its parent (the Kanvas).
 * It also uses the parent for several other things. The vue event @node-selection-preview is used for a fast selection
 * preview. This is caused by the slowness of the store. The WorkflowPanel forwards those events to the Workflow
 * which calls the Node (via $refs) to show a selection preview. We know that this is not very vue-ish and data should
 * define what is rendered, but that's too slow in this case.
 */
export default defineComponent({
  setup: () => {
    const { shouldHideSelection } = storeToRefs(useSelectionStore());
    return {
      shouldHideSelection,
    };
  },
  data: (): RectangleSelectionData => ({
    startPos: {
      x: 0,
      y: 0,
    },
    endPos: {
      x: 0,
      y: 0,
    },
    pointerId: null,
    nodeIdsToSelectOnEnd: [],
    nodeIdsToDeselectOnEnd: [],
    selectedNodeIdsAtStart: [],

    inverseMode: false,
    moved: false,

    annotationIdsToSelectOnEnd: [],
    annotationIdsToDeselectOnEnd: [],
    selectedAnnotationIdsAtStart: [],
  }),
  computed: {
    ...mapState(useWorkflowStore, ["activeWorkflow"]),
    ...mapState(useSVGCanvasStore, ["screenToCanvasCoordinates"]),
    ...mapState(useSelectionStore, [
      "selectedNodeIds",
      "selectedAnnotationIds",
    ]),

    selectionBounds() {
      const { endPos, startPos } = this;

      return {
        x: Math.min(startPos.x, endPos.x),
        y: Math.min(startPos.y, endPos.y),

        width: Math.abs(startPos.x - endPos.x),
        height: Math.abs(startPos.y - endPos.y),
      };
    },

    calculateSelection() {
      const selection = [
        ...this.selectedNodeIdsAtStart,
        ...this.nodeIdsToSelectOnEnd,
      ];

      return this.inverseMode
        ? selection.filter(
            (nodeId) => !this.nodeIdsToDeselectOnEnd.includes(nodeId),
          )
        : selection;
    },

    calculateAnnotationSelection() {
      const selection = [
        ...this.selectedAnnotationIdsAtStart,
        ...this.annotationIdsToSelectOnEnd,
      ];

      return this.inverseMode
        ? selection.filter(
            (annotationId) =>
              !this.annotationIdsToDeselectOnEnd.includes(annotationId),
          )
        : selection;
    },
  },
  created() {
    this.$bus.on("selection-pointerdown", this.startRectangleSelection);
    this.$bus.on("selection-pointerup", this.stopRectangleSelection);
    this.$bus.on("selection-pointermove", this.updateRectangleSelection);
    this.$bus.on("selection-lostpointercapture", this.stopRectangleSelection);
  },
  beforeUnmount() {
    this.$bus.off("selection-pointerdown", this.startRectangleSelection);
    this.$bus.off("selection-pointerup", this.stopRectangleSelection);
    this.$bus.off("selection-pointermove", this.updateRectangleSelection);
    this.$bus.off("selection-lostpointercapture", this.stopRectangleSelection);
  },
  methods: {
    ...mapActions(useSelectionStore, [
      "deselectAllObjects",
      "selectAnnotations",
      "deselectAnnotations",
      "deselectAllPreselectedObjects",
      "preselectNodes",
      "preselectAnnotations",
      "setPreselectionMode",
    ]),

    startRectangleSelection(event: PointerEvent) {
      this.pointerId = event.pointerId;
      (event.target! as HTMLElement).setPointerCapture(event.pointerId);

      [this.startPos.x, this.startPos.y] = this.screenToCanvasCoordinates([
        event.clientX,
        event.clientY,
      ]);
      this.endPos = { ...this.startPos };

      this.clearState();

      if (event.shiftKey || event.ctrlKey || event.metaKey) {
        this.inverseMode = true;
        // remember currently selected nodes, the nodes under the rectangle will inverse them
        this.selectedNodeIdsAtStart = [...this.selectedNodeIds];
        this.selectedAnnotationIdsAtStart = [...this.selectedAnnotationIds];
      } else {
        this.inverseMode = false;
        this.selectedNodeIdsAtStart = [];
        this.selectedAnnotationIdsAtStart = [];
      }
      this.moved = false;
    },

    // Because the selection update/move function is throttled we also need to
    // throttle the stop function to guarantee order of event handling
    stopRectangleSelection: throttle(async function (
      this: any,
      event: PointerEvent,
    ) {
      /* eslint-disable no-invalid-this */
      this.deselectAllPreselectedObjects();
      this.setPreselectionMode(false);

      if (this.pointerId !== event.pointerId) {
        return;
      }
      (event.target! as HTMLElement).releasePointerCapture(this.pointerId);

      // hide rect
      this.pointerId = null;

      if (!this.moved) {
        this.clearState();
        return;
      }

      const { wasAborted } = await this.deselectAllObjects(
        this.calculateSelection,
      );
      if (!wasAborted) {
        await this.selectAnnotations(this.calculateAnnotationSelection);
      }

      this.clearState();
      /* eslint-enable no-invalid-this */
    }),

    clearState() {
      this.nodeIdsToSelectOnEnd = [];
      this.nodeIdsToDeselectOnEnd = [];
      this.selectedNodeIdsAtStart = [];

      this.annotationIdsToSelectOnEnd = [];
      this.annotationIdsToDeselectOnEnd = [];
      this.selectedAnnotationIdsAtStart = [];
    },

    updateRectangleSelection: throttle(function (this: any, e) {
      /* eslint-disable no-invalid-this */
      if (this.pointerId !== e.pointerId) {
        return;
      }

      if (!this.moved) {
        if (
          Math.abs(this.startPos.x - e.clientX) > MOVE_THRESHOLD ||
          Math.abs(this.startPos.y - e.clientY) > MOVE_THRESHOLD
        ) {
          this.moved = true;
        }
      }

      [this.endPos.x, this.endPos.y] = this.screenToCanvasCoordinates([
        e.clientX,
        e.clientY,
      ]);
      this.previewSelectionForItemsInRectangle(this.startPos, this.endPos);
      /* eslint-enable no-invalid-this */
    }),

    previewSelectionForItemsInRectangle(startPos: XY, endPos: XY) {
      let { nodesInside, annotationsInside } = findObjectsForSelection({
        startPos,
        endPos,
        workflow: this.activeWorkflow!,
      });

      this.nodeIdsToSelectOnEnd = nodesInside.filter(
        (nodeId) => !this.selectedNodeIdsAtStart.includes(nodeId),
      );
      this.nodeIdsToDeselectOnEnd = nodesInside.filter((nodeId) =>
        this.selectedNodeIdsAtStart.includes(nodeId),
      );

      this.annotationIdsToSelectOnEnd = annotationsInside.filter(
        (annotationId) =>
          !this.selectedAnnotationIdsAtStart.includes(annotationId),
      );
      this.annotationIdsToDeselectOnEnd = annotationsInside.filter(
        (annotationId) =>
          this.selectedAnnotationIdsAtStart.includes(annotationId),
      );

      this.setPreselectionMode(true);
      this.deselectAllPreselectedObjects();
      this.preselectNodes(this.calculateSelection);
      this.preselectAnnotations(this.calculateAnnotationSelection);
    },
  },
});
</script>

<template>
  <rect
    v-show="pointerId !== null"
    :x="selectionBounds.x"
    :y="selectionBounds.y"
    :width="selectionBounds.width"
    :height="selectionBounds.height"
    :stroke="$colors.kanvasNodeSelection.activeBorder"
    stroke-dasharray="5"
    vector-effect="non-scaling-stroke"
  />
</template>

<style lang="postcss" scoped>
rect {
  fill: none;
  stroke-width: 1;
}
</style>
