<script>
/**
 * Selection frame around a node.
 */
export default {
    props: {
        /**
         * X- and Y-Coordinate of the top left corner of the node torso, relative to the top left of the canvas.
         * This must be provided from outside, since this component is not rendered as a child element of the Node.
         */
        x: {
            type: Number,
            default: 0
        },
        y: {
            type: Number,
            default: 0
        },
        /** if active node is selected otherwise hovered */
        active: {
            type: Boolean,
            default: false
        },
        /** Metanodes don't have status bars */
        hasStatusBar: {
            type: Boolean,
            default: true
        },
        /**
         * Node id to be displayed
         */
        nodeId: {
            type: String,
            default: 'NODE ID MISSING'
        }
    },
    computed: {
        /**
         * @returns {Number[]} [up, right, bottom, left] margin around the node's torso
         */
        padding() {
            // eslint-disable-next-line no-magic-numbers
            const { nodeStatusHeight, nodeStatusMarginTop,
                nodeSelectionPadding: [top, right, bottom, left] } = this.$shapes;
            return [
                top,
                right,
                bottom + (this.hasStatusBar ? nodeStatusHeight + nodeStatusMarginTop : 0),
                left
            ];
        }
    }
};
</script>

<template>
  <g
    :transform="`translate(${x}, ${y})`"
    :class="['selection', {active}]"
  >
    <rect
      :y="-padding[0]"
      :x="-padding[1]"
      :width="padding[1] + $shapes.nodeSize + padding[3]"
      :height="padding[0] + $shapes.nodeSize + padding[2]"
      :fill="active ? $colors.selection.activeBackground : $colors.selection.hoverBackground"
      :stroke="active ? $colors.selection.activeBorder : null"
      stroke-width="1"
      rx="4"
    />
    <text
      text-anchor="middle"
      :y="-padding[0] - 15"
      :x="$shapes.nodeSize / 2"
    >
      {{ nodeId }}
    </text>
  </g>
</template>

<style lang="postcss" scoped>
text {
  font: normal 10px "Roboto Condensed", sans-serif;
  pointer-events: none;
}
</style>
