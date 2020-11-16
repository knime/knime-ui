<script>
import { mapState } from 'vuex';
import portShift from '~/util/portShift';
import { portBar } from '~/mixins';

/**
 * A curved line, connecting one node's output with another node's input port.
 * Must be embedded in an `<svg>` element.
 */
export default {
    mixins: [portBar],
    inheritAttrs: false,
    props: {
        /**
         * Node ID of the connector's source node
         */
        sourceNode: { type: String, required: true },
        /**
         * Node ID of the connector's target node
         */
        destNode: { type: String, required: true },
        /**
         * Index of the source node's output port that this connector is attached to
         */
        sourcePort: { type: Number, required: true },
        /**
         * Index of the target node's input port that this connector is attached to
         */
        destPort: { type: Number, required: true },
        /**
         * Determines whether this connector is rendered in alternative color
         */
        flowVariableConnection: { type: Boolean, default: false }
    },
    computed: {
        ...mapState('workflow', {
            workflow: 'activeWorkflow'
        }),
        /**
         * The start coordinates of this connector
         * @returns {Object} coordinates containing `x` and `y` properties
         */
        start() {
            return this.getEndPointCoordinates('source');
        },
        /**
         * The end coordinates of this connector
         * @returns {Object} coordinates containing `x` and `y` properties
         */
        end() {
            return this.getEndPointCoordinates('dest');
        },
        path() {
            const { start: [x1, y1], end: [x2, y2] } = this;
            const width = Math.abs(x1 - x2 + this.$shapes.portSize);
            const height = Math.abs(y1 - y2);
            // TODO: include bendpoints NXT-78 NXT-191
            // Currently, this is creates just an arbitrary curve that seems to work in most cases
            /* eslint-disable no-magic-numbers */
            return `M${x1},${y1} h${this.$shapes.portSize / 2} ` +
                `C${x1 + width / 2 + height / 3},${y1} ` +
                `${x2 - width / 2 - height / 3},${y2} ` +
                `${x2 - this.$shapes.portSize + 0.5},${y2} h${this.$shapes.portSize / 2}`;
            /* eslint-enable no-magic-numbers */
        },
        strokeColor() {
            if (this.flowVariableConnection) {
                return this.$colors.connectorColors.flowVariable;
            }
            return this.$colors.connectorColors.default;
        }
    },
    methods: {
        /**
         * Determine the end point coordinates of the start point ('source') or end point ('dest') of the connector
         * @param {String} type One of 'source' / 'dest'. Defaults to 'dest'
         * @returns {Array} The coordinates
         */
        getEndPointCoordinates(type = 'dest') {
            let sourceNodeIndex = this[`${type}Port`];
            let node = this.$store.state.nodes[this.workflow.projectId]?.[this[`${type}Node`]];
            if (node) {
                // connected to a node
                return this.getRegularNodePortPos({ sourceNodeIndex, type, node });
            } else {
                // connected to a metanode port bar
                return this.getMetaNodePortPos({ sourceNodeIndex, type });
            }
        },
        getRegularNodePortPos({ sourceNodeIndex, type, node }) {
            let allPorts = type === 'source' ? node.outPorts : node.inPorts;
            const [dx, dy] = portShift(
                sourceNodeIndex, allPorts.length, node.kind === 'metanode', type === 'source'
            );
            let { x, y } = node.position;
            return [
                x + dx,
                y + dy
            ];
        },
        getMetaNodePortPos({ sourceNodeIndex, type }) {
            let allPorts = type === 'source' ? this.workflow.metaInPorts : this.workflow.metaOutPorts;
            let x = this.portBarXPos(allPorts, type === 'dest');
            let delta = this.$shapes.portSize / 2;
            x += type === 'source' ? delta : -delta;
            let y = this.portBarItemYPos(sourceNodeIndex, allPorts.ports, true);
            return [x, y];
        }
    }
};
</script>

<template>
  <path
    :d="path"
    :stroke="strokeColor"
    :stroke-width="$shapes.connectorWidth"
    :class="{ variable: flowVariableConnection }"
    fill="none"
  />
</template>

<style lang="postcss" scoped>
path {
  transition: stroke-width 0.1s linear, stroke 0.2s linear;
  cursor: grab;
}

path:hover {
  stroke-width: 2.5;
  stroke: var(--knime-dove-gray);
}

path.variable:hover {
  stroke: var(--knime-coral-dark);
}
</style>
