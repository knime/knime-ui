<script>
import { mapState, mapGetters } from "vuex";
import { connectorPosition } from "@/mixins";

/**
 * A label displaying the amount of processed rows on the middle of two set points.
 * Uses the connectorPosition mixin to get the start and end position of the connector.
 */
export default {
  mixins: [connectorPosition],
  props: {
    /**
     * Defines the text value of the label
     */
    label: { type: String, default: "" },
  },
  data() {
    return {
      // An arbitrary high value to always show the full label.
      labelWidth: 1000,
      // An arbitrary height value to make the label visible
      labelHeight: 60,
      // A value that defines the offset from the label to the actual middle point.
      // This prevents the label from overlapping the connector line.
      offsetY: 16,
    };
  },
  computed: {
    ...mapState("workflow", ["movePreviewDelta", "isDragging"]),
    ...mapGetters("selection", ["isNodeSelected"]),
    /**
     * Find the position between two connectors and add some offset to let the label
     * appear above the connector line
     * @returns {Array} coordinates [x, y]
     */
    halfWayPosition() {
      // Calculates the middle point and subtracts half of the length of the text element
      let offset = { x: 0, y: 0 };
      if (
        this.isDragging &&
        (this.isNodeSelected(this.sourceNode) ||
          this.isNodeSelected(this.destNode))
      ) {
        offset = this.movePreviewDelta;
      }

      return [
        this.start[0] +
          (this.end[0] - this.start[0] + offset.x) / 2 -
          this.labelWidth / 2,
        this.start[1] +
          (this.end[1] - this.start[1] + offset.y) / 2 -
          this.offsetY -
          this.labelHeight / 2,
      ];
    },
  },
};
</script>

<template>
  <foreignObject
    v-if="label.length > 0"
    class="foreign-object"
    :width="labelWidth"
    :height="labelHeight"
    :transform="`translate(${halfWayPosition})`"
  >
    <p class="text-wrapper">
      <span class="streaming-label">
        {{ label }}
      </span>
    </p>
  </foreignObject>
</template>

<style lang="postcss" scoped>
.streaming-label {
  color: white;
  font-size: 12px;
  box-shadow: 0 0 4px rgb(0 0 0 / 25%);
  border-radius: 2px;
  background-color: var(--knime-masala);
  padding: 5px;
}

.text-wrapper {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
}

.foreign-object {
  pointer-events: none;
}
</style>
