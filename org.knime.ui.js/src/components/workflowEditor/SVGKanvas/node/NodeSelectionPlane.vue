<script lang="ts">
import type { PropType } from "vue";
import { defineComponent } from "vue";

import type { Node, XY } from "@/api/gateway-api/generated-api";

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
        nodeCardWidth,
        nodeCardHeight,
        nodeSelectionPadding: [top, right, bottom, left],
      } = this.$shapes;

      const isMetanode = this.kind === "metanode";

      if (!isMetanode) {
        // Card nodes: selection rect wraps the card with a small inset padding
        const pad = 4;
        const height = nodeCardHeight + this.extraHeight + pad * 2;
        const defaultWidth = nodeCardWidth + pad * 2;
        const width = this.width > defaultWidth ? this.width : defaultWidth;
        return {
          y: -(this.extraHeight + pad),
          x: -pad,
          height,
          width,
        };
      }

      // Metanodes: keep original layout
      const height =
        top +
        nodeSize +
        bottom +
        nodeStatusHeight +
        nodeStatusMarginTop +
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
      :fill="$colors.kanvasNodeSelection.activeBackground"
      :stroke="$colors.kanvasNodeSelection.activeBorder"
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
      :fill="$colors.kanvasNodeSelection.activeBackground"
      :stroke="$colors.kanvasNodeSelection.activeBorder"
      :stroke-width="$shapes.selectedNodeStrokeWidth"
      :rx="$shapes.selectedItemBorderRadius"
    />
  </g>
</template>
