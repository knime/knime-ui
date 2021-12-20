<script>

/**
 * Colored rect that is used as selection plane for nodes
 */
export default {
    components: {

    },
    props: {
        /**
         * The position of the node. Contains of an x and a y parameter
         */
        position: {
            type: Object,
            required: true,
            validator: position => typeof position.x === 'number' && typeof position.y === 'number'
        },
        /**
         * Node variation.
         * @values 'node', 'metanode', 'component'
         */
        kind: {
            type: String,
            required: true,
            validator: kind => ['node', 'metanode', 'component'].includes(kind)
        }
    },
    computed: {
        // Getting the node selection measures and calculate if some additional space is neede for the status bar
        nodeSelectionMeasures() {
            const { nodeStatusHeight, nodeStatusMarginTop, nodeSize,
                nodeSelectionPadding: [top, right, bottom, left] } = this.$shapes;
            const hasStatusBar = this.kind !== 'metanode';

            return {
                y: -top,
                x: -left,
                height: (top + nodeSize + bottom) + (hasStatusBar ? nodeStatusHeight + nodeStatusMarginTop : 0),
                width: left + right + nodeSize
            };
        }
    }
};
</script>

<template>
  <g :transform="`translate(${position.x}, ${position.y})`">
    <rect
      :x="nodeSelectionMeasures.x"
      :y="nodeSelectionMeasures.y"
      :width="nodeSelectionMeasures.width"
      :height="nodeSelectionMeasures.height"
      :fill="$colors.selection.activeBackground"
      :stroke="$colors.selection.activeBorder"
      stroke-width="1"
      rx="4"
    />
  </g>
</template>

<style lang="postcss" scoped>

</style>
