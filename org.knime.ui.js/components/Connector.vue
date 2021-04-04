<script>
import { mapState, mapGetters } from 'vuex';
import { portBar, connectorPosition } from '~/mixins';

/**
 * A curved line, connecting one node's output with another node's input port.
 * Must be embedded in an `<svg>` element.
 * Uses the connectorPosition mixin to get the start and end position of the connector.
 */
export default {
    mixins: [portBar, connectorPosition],
    inheritAttrs: false,
    props: {
        /**
         * Determines whether this connector is streamed at the moment
         */
        streaming: { type: Boolean, default: false },
        /**
         * Determines whether this connector is rendered in alternative color
         */
        flowVariableConnection: { type: Boolean, default: false }
    },
    computed: {
        ...mapState('workflow', {
            workflow: 'activeWorkflow',
            isDragging: 'isDragging',
            deltaMovePosition: 'deltaMovePosition',
            moveNodeGhostThresholdExceeded: 'moveNodeGhostThresholdExceeded'
        }),
        ...mapGetters('workflow', {
            isWorkflowWritable: 'isWritable',
            selectedNodes: 'selectedNodes'
        }),
        path() {
            let { start: [x1, y1], end: [x2, y2] } = this;
            // Update position of source or destination node is beeing moved
            if (this.isDragging && !this.moveNodeGhostThresholdExceeded) {
                if (this.selectedNodes.filter(node => node.id === this.sourceNode).length > 0) {
                    x1 += this.deltaMovePosition.x;
                    y1 += this.deltaMovePosition.y;
                }
                if (this.selectedNodes.filter(node => node.id === this.destNode).length > 0) {
                    x2 += this.deltaMovePosition.x;
                    y2 += this.deltaMovePosition.y;
                }
            }
            // These deltas are carefully chosen so that the connector line is hidden behind the flow variable line,
            // especially for optional ports, even when hovering the port or the connector line.
            // (Optional output ports are useless, but are technically possible and do exist out in the wild)
            /* eslint-disable no-magic-numbers */
            x1 += this.$shapes.portSize / 2 - (this.sourcePortType === 'table' ? 2.5 : 0.5);
            x2 -= this.$shapes.portSize / 2 - 0.5;
            const width = Math.abs(x1 - x2);
            const height = Math.abs(y1 - y2);
            // TODO: include bendpoints NXT-78 NXT-191
            // Currently, this is creates just an arbitrary curve that seems to work in most cases
            return `M${x1},${y1} ` +
                `C${x1 + width / 2 + height / 3},${y1} ` +
                `${x2 - width / 2 - height / 3},${y2} ` +
                `${x2},${y2}`;
            /* eslint-enable no-magic-numbers */
        },
        strokeColor() {
            if (this.flowVariableConnection) {
                return this.$colors.connectorColors.flowVariable;
            }
            return this.$colors.connectorColors.default;
        }
    }
};
</script>

<template>
  <g>
    <path
      :d="path"
      :stroke="strokeColor"
      :stroke-width="$shapes.connectorWidth"
      :class="{ variable: flowVariableConnection, 'read-only': !isWorkflowWritable, dashed: streaming }"
      fill="none"
    />
  </g>
</template>

<style lang="postcss" scoped>
path {
  transition: stroke-width 0.1s linear, stroke 0.2s linear;
}

path:not(.read-only) {
  cursor: grab;
}

path:hover {
  stroke-width: 2.5;
  stroke: var(--knime-dove-gray);
}

path.variable:hover {
  stroke: var(--knime-coral-dark);
}

rect {
  fill: var(--knime-masala);
  stroke-linecap: round;
}

.dashed {
  stroke-dasharray: 5;
  stroke-dashoffset: 50;
  animation: dash 3s linear infinite;
}

@keyframes dash {
  from {
    stroke-dashoffset: 100;
  }

  to {
    stroke-dashoffset: 0;
  }
}
</style>
