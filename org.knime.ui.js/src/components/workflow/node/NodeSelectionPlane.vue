<script lang="ts">
import type { Node, XY } from "@/api/gateway-api/generated-api";
import type { PropType } from "vue";
import { defineComponent } from "vue";

/**
 * Colored rect that is used as selection plane for nodes
 */
export default defineComponent({
  props: {
    /**
     * The position of the node. Contains an x- and y-parameter
     */
    position: {
      type: Object as PropType<XY>,
      required: true,
      validator: (position: XY) =>
        typeof position.x === "number" && typeof position.y === "number",
    },
    /**
     * Makes the selection plane larger vertically based on this value
     */
    extraHeight: {
      type: Number,
      default: 20,
    },
    width: {
      type: Number,
      default: 0,
    },
    /**
     * Node variation.
     * @values 'node', 'metanode', 'component'
     */
    kind: {
      type: String as PropType<Node.KindEnum>,
      required: true,
      validator: (kind) =>
        ["node", "metanode", "component"].includes(kind as Node.KindEnum),
    },

    showSelection: {
      type: Boolean,
      default: true,
    },

    showFocus: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    // Getting the node selection measures and calculate if some additional space is needed for the status bar
    nodeSelectionMeasures() {
      const {
        nodeStatusHeight,
        nodeStatusMarginTop,
        nodeSize,
        nodeSelectionPadding: [top, right, bottom, left],
      } = this.$shapes;

      const hasStatusBar = this.kind !== "metanode";

      // the selection plane's height has to account for
      // (1) node's size plus the selection padding for top and bottom
      // (2) the height and margin of the node status bar if it's present
      // (3) the provided `extraHeight` prop on the component
      const height =
        top +
        nodeSize +
        bottom +
        (hasStatusBar ? nodeStatusHeight + nodeStatusMarginTop : 0) +
        this.extraHeight;

      const defaultWidth = left + right + nodeSize;
      const width = this.width > defaultWidth ? this.width : defaultWidth;

      return {
        y: -(top + this.extraHeight),
        x: -((width - nodeSize) / 2),
        height,
        width,
      };
    },
  },
});
</script>

<template>
  <g :transform="`translate(${position.x}, ${position.y})`">
    <rect
      v-if="showFocus"
      data-test-id="focus-plane"
      :x="nodeSelectionMeasures.x - 4"
      :y="nodeSelectionMeasures.y - 4"
      :width="nodeSelectionMeasures.width + 8"
      :height="nodeSelectionMeasures.height + 8"
      :fill="$colors.selection.activeBackground"
      :stroke="$colors.selection.activeBorder"
      :stroke-width="$shapes.selectedNodeStrokeWidth"
      :stroke-dasharray="5"
      :rx="$shapes.selectedItemBorderRadius"
    />

    <rect
      v-if="showSelection"
      data-test-id="selection-plane"
      :x="nodeSelectionMeasures.x"
      :y="nodeSelectionMeasures.y"
      :width="nodeSelectionMeasures.width"
      :height="nodeSelectionMeasures.height"
      :fill="$colors.selection.activeBackground"
      :stroke="$colors.selection.activeBorder"
      :stroke-width="$shapes.selectedNodeStrokeWidth"
      :rx="$shapes.selectedItemBorderRadius"
    />
  </g>
</template>
