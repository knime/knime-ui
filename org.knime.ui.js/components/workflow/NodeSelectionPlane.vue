<script>

/**
 * Colored rect that is used as selection plane for nodes
 */
export default {
    props: {
        /**
         * The position of the node. Contains an x- and y-parameter
         */
        position: {
            type: Object,
            required: true,
            validator: position => typeof position.x === 'number' && typeof position.y === 'number'
        },
        // TODO: write comment
        extraHeight: {
            type: Number,
            default: 20
        },
        width: {
            type: Number,
            default: 0
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
        // Getting the node selection measures and calculate if some additional space is needed for the status bar
        nodeSelectionMeasures() {
            // TODO: please improve readability and add commments
            const { nodeStatusHeight, nodeStatusMarginTop, nodeSize,
                nodeSelectionPadding: [top, right, bottom, left] } = this.$shapes;
            const hasStatusBar = this.kind !== 'metanode';

            const height = (top + nodeSize + bottom) +
                (hasStatusBar ? nodeStatusHeight + nodeStatusMarginTop : 0) +
                this.extraHeight;

            const defaultWidth = left + right + nodeSize;
            const width = this.width > defaultWidth ? this.width : defaultWidth;

            return {
                y: -(top + this.extraHeight),
                x: -((width - nodeSize) / 2),
                height,
                width
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
      :stroke-width="$shapes.selectedNodeStrokeWidth"
      :rx="$shapes.selectedNodeBorderRadius"
    />
  </g>
</template>
