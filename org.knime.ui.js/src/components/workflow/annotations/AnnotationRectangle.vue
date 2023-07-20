<script>
import { mapGetters, mapState } from "vuex";
import throttle from "raf-throttle";

export default {
  data: () => ({
    startPosition: {
      x: 0,
      y: 0,
    },
    endPosition: {
      x: 0,
      y: 0,
    },
    pointerId: null,
  }),
  computed: {
    ...mapState("workflow", ["activeWorkflow"]),
    ...mapGetters("canvas", ["screenToCanvasCoordinates"]),
    selectionBounds() {
      const { endPosition, startPosition } = this;

      return {
        x: Math.min(startPosition.x, endPosition.x),
        y: Math.min(startPosition.y, endPosition.y),

        width: Math.abs(startPosition.x - endPosition.x),
        height: Math.abs(startPosition.y - endPosition.y),
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

      [this.startPosition.x, this.startPosition.y] =
        this.screenToCanvasCoordinates([e.clientX, e.clientY]);
      this.endPosition = { ...this.startPosition };
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
        this.$store.dispatch("application/switchCanvasMode", "selection");
      }, 0);
      /* eslint-enable no-invalid-this */
    }),

    updateAnnotationDrag: throttle(function (e) {
      /* eslint-disable no-invalid-this */
      if (this.pointerId !== e.pointerId) {
        return;
      }

      [this.endPosition.x, this.endPosition.y] = this.screenToCanvasCoordinates(
        [e.clientX, e.clientY]
      );
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
    :stroke="$colors.Cornflower"
    vector-effect="non-scaling-stroke"
  />
</template>

<style lang="postcss" scoped>
rect {
  fill: none;
  stroke-width: 2;
}
</style>
