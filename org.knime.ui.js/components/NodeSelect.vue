<script>
/**
 * Selection frame around a node.
 */
export default {
    props: {
        /**
         * Offset relative to the top left of the canvas.
         * This must be provided from outside, since this component is not rendered as a child element of the Node.
         * @example [100, 50] // 100px from the left, 50px from the top
         */
        offset: {
            type: Array,
            default: () => [0, 0]
        },
        /**
         * Node id to be displayed
         */
        nodeID: {
            type: String,
            default: 'NODE ID MISSING'
        }
    },
    computed: {
        // eslint-disable-next-line no-magic-numbers
        padding: () => [25, 22, 20, 22], // padding around node
        roundness: () => 2, // can be nodeSelectionBarHeight at maximum
        selectionBarPath() {
            const { padding, roundness, $shapes: { nodeSelectionBarHeight, nodeSize } } = this;

            return `M${-padding[3]},${-padding[0]}
            v-${nodeSelectionBarHeight - roundness} q 0,-${roundness} ${roundness},-${roundness}
            h${padding[3] + nodeSize + padding[1] - roundness - roundness} q ${roundness},0 ${roundness},${roundness}
            v${nodeSelectionBarHeight - roundness}
            Z`;
        }
    }
};
</script>

<template>
  <g
    :transform="`translate(${offset[0]}, ${offset[1]})`"
    :class="['selection']"
  >
    <rect
      :y="-padding[0] - $shapes.nodeSelectionBarHeight"
      :x="-padding[1]"
      :width="padding[1] + $shapes.nodeSize + padding[3]"
      :height="padding[0] + $shapes.nodeSize + padding[2] + $shapes.nodeSelectionBarHeight"
      :rx="roundness"
      class="selection-frame"
    />
    <path
      :d="selectionBarPath"
      class="selection-bar"
    />
    <text
      text-anchor="middle"
      :y="-padding[0] - 3"
      :x="$shapes.nodeSize / 2"
    >
      {{ nodeID }}
    </text>
  </g>
</template>

<style scoped>
text {
  font: normal 10px "Roboto Condensed", sans-serif;
}

.selection-frame {
  stroke-width: 2px;
  stroke: silver;
  fill: rgba(185, 226, 254, 0.2);
  pointer-events: none;
}

.selection-bar {
  fill: silver;
  stroke: silver;
  pointer-events: none;
}
</style>
