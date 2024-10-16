<script lang="ts">
import type { PropType } from "vue";
import { defineComponent } from "vue";

import { Node } from "@/api/gateway-api/generated-api";

/**
 * Calculates the size of the Node hover area based on different criteria.
 * Also detects conector events and emits the corresponding event up to the parent
 */
export default defineComponent({
  props: {
    isHovering: {
      type: Boolean,
      default: false,
    },
    nodeNameDimensions: {
      type: Object as PropType<{ width: number; height: number }>,
      required: true,
    },
    portPositions: {
      type: Object as PropType<{
        in: Array<[number, number]>;
        out: Array<[number, number]>;
      }>,
      required: true,
    },
    isConnectorHovering: {
      type: Boolean,
      default: false,
    },
    allowedActions: {
      type: Object as PropType<NonNullable<Node["allowedActions"]>>,
      default: () => ({}),
    },
    dialogType: {
      type: String as PropType<Node.DialogTypeEnum>,
      default: null,
    },
    isUsingEmbeddedDialogs: {
      type: Boolean,
      default: true,
    },
  },

  computed: {
    portBarBottom() {
      const portPositions = this.portPositions;
      const lastInPort = portPositions.in[portPositions.in.length - 1];
      const lastOutPort = portPositions.out[portPositions.out.length - 1];

      // take y-position of last port in the list or default to 0 for an empty list
      const lastInPortY = lastInPort?.[1] || 0;
      const lastOutPortY = lastOutPort?.[1] || 0;

      return Math.max(lastInPortY, lastOutPortY) + this.$shapes.portSize / 2;
    },
    /**
     * Calculates the width of the hover area of the node.
     * The size increases when the node is hovered and either a dialog button or the view button is available,
     * so that all the action buttons are reachable.
     * @return {object} the size and position of the hover area of the node
     */
    hoverSize() {
      let hoverBounds = {
        top: -this.$shapes.nodeHoverMargin[0],
        left: -this.$shapes.nodeHoverMargin[1],
        bottom: this.$shapes.nodeSize + this.$shapes.nodeHoverMargin[2],
        right: this.$shapes.nodeSize + this.$shapes.nodeHoverMargin[3],
      };

      // adjust upper hover bounds to node name
      hoverBounds.top -= this.nodeNameDimensions.height;

      if (this.isHovering) {
        // buttons are shown as disabled if false, hidden if null
        let extraHorizontalSpace = 0;

        if (
          (this.dialogType === Node.DialogTypeEnum.Web &&
            this.isUsingEmbeddedDialogs) ||
          this.dialogType === Node.DialogTypeEnum.Swing
        ) {
          extraHorizontalSpace += this.$shapes.nodeActionBarButtonSpread;
        }

        if ("canOpenView" in this.allowedActions) {
          extraHorizontalSpace += this.$shapes.nodeActionBarButtonSpread;
        }

        hoverBounds.left -= extraHorizontalSpace / 2;
        hoverBounds.right += extraHorizontalSpace / 2;
      }

      if (this.isConnectorHovering || this.isHovering) {
        // enlarge hover area to include all ports

        const margin = this.$shapes.nodeHoverPortBottomMargin;

        // if portBarBottom + margin is larger, then extend hover bounds
        hoverBounds.bottom = Math.max(
          this.portBarBottom + margin,
          hoverBounds.bottom,
        );
      }

      return {
        y: hoverBounds.top,
        x: hoverBounds.left,
        width: hoverBounds.right - hoverBounds.left,
        height: hoverBounds.bottom - hoverBounds.top,
      };
    },
  },
});
</script>

<template>
  <g>
    <slot :hover-size="hoverSize" />
  </g>
</template>
