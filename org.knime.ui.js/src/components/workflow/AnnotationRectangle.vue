<script>
import { mapGetters, mapState } from "vuex";
import throttle from "raf-throttle";

export default {
  data: () => ({
    startPos: {
      x: 0,
      y: 0,
    },
    endPos: {
      x: 0,
      y: 0,
    },
    pointerId: null,
  }),
  computed: {
    ...mapState("workflow", ["activeWorkflow"]),
    ...mapGetters("canvas", ["screenToCanvasCoordinates"]),
    selectionBounds() {
      const { endPos, startPos } = this;

      return {
        x: Math.min(startPos.x, endPos.x),
        y: Math.min(startPos.y, endPos.y),

        width: Math.abs(startPos.x - endPos.x),
        height: Math.abs(startPos.y - endPos.y),
      };
    },
  },
  created() {
    this.$bus.on("selection-pointerdown", this.startAnnotationDrag);
    this.$bus.on("selection-pointerup", this.stopAnnotationDrag);
    this.$bus.on("selection-pointermove", this.updateAnnotationDrag);
    this.$bus.on("selection-lostpointercapture", this.stopAnnotationDrag);
  },
  beforeUnmount() {
    this.$bus.off("selection-pointerdown", this.startAnnotationDrag);
    this.$bus.off("selection-pointerup", this.stopAnnotationDrag);
    this.$bus.off("selection-pointermove", this.updateAnnotationDrag);
    this.$bus.off("selection-lostpointercapture", this.stopAnnotationDrag);
  },
  methods: {
    startAnnotationDrag(e) {
      this.pointerId = e.pointerId;
      e.target.setPointerCapture(e.pointerId);

      [this.startPos.x, this.startPos.y] = this.screenToCanvasCoordinates([
        e.clientX,
        e.clientY,
      ]);
      this.endPos = { ...this.startPos };
    },

    // Because the selection update/move function is throttled we also need to
    // throttle the stop function to guarantee order of event handling
    stopAnnotationDrag: throttle(function (event) {
      /* eslint-disable no-invalid-this */
      if (this.pointerId !== event.pointerId) {
        return;
      }
      event.target.releasePointerCapture(this.pointerId);

      // hide rect
      this.pointerId = null;

      setTimeout(() => {
        const { x, y, width, height } = this.selectionBounds;
        this.$shortcuts.dispatch("addWorkflowAnnotation", {
          event,
          metadata: {
            position: { x, y },
            width,
            height,
          },
        });
        this.$store.dispatch("application/toggleAnnotationMode");
      }, 0);
      /* eslint-enable no-invalid-this */
    }),

    updateAnnotationDrag: throttle(function (e) {
      /* eslint-disable no-invalid-this */
      if (this.pointerId !== e.pointerId) {
        return;
      }

      [this.endPos.x, this.endPos.y] = this.screenToCanvasCoordinates([
        e.clientX,
        e.clientY,
      ]);
    }),
  },
};
</script>

<template>
  <rect
    v-show="pointerId !== null"
    :x="selectionBounds.x"
    :y="selectionBounds.y"
    :width="selectionBounds.width"
    :height="selectionBounds.height"
    :stroke="$colors.Yellow"
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
