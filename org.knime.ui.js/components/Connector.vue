<script>
import { mapState, mapGetters } from 'vuex';
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
         * Determines wheter this connector is steamed at the moment
         */
        streaming: { type: Boolean, default: false },
        /**
         * Determines wheter this connector is steamed at the moment
         */
        label: { type: String, default: '' },
        /**
         * Determines whether this connector is rendered in alternative color
         */
        flowVariableConnection: { type: Boolean, default: false }
    },
    data() {
        return {
            isMounted: false,
            updated: 0,
            size: { width: 0, height: 0 }
        };
    },
    computed: {
        ...mapState('workflow', {
            workflow: 'activeWorkflow'
        }),
        ...mapGetters('workflow', {
            isWorkflowWritable: 'isWritable'
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
        sourceNodeObject() {
            return this.$store.state.workflow.activeWorkflow.nodes[this.sourceNode];
        },
        destNodeObject() {
            return this.$store.state.workflow.activeWorkflow.nodes[this.destNode];
        },
        sourcePortType() {
            return (this.sourceNodeObject?.outPorts || this.workflow.metaInPorts.ports)[this.sourcePort].type;
        },
        destPortType() {
            return (this.destNodeObject?.inPorts || this.workflow.metaOutPorts.ports)[this.destPort].type;
        },
        path() {
            let { start: [x1, y1], end: [x2, y2] } = this;
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
        },
        wrapperSize() {
            return this.$refs.textContent.getBBox();
        }
    },
    watch: {
        label: {
            immediate: true,
            handler(newVal, oldVal) {
                let self = this;
                this.$nextTick(() => {
                    if (self.$refs.textContent) {
                        const offset = 6;
                        self.size = {
                            width: self.$refs.textContent.clientWidth + offset,
                            height: self.$refs.textContent.clientHeight + offset
                        };
                    } else {
                        self.size = {
                            width: 0,
                            height: 0
                        };
                    }
                });
            },
            deep: true
        }
    },
    mounted() {
        this.isMounted = true;
    },
    methods: {
        /**
         * Determine the end point coordinates of the start point ('source') or end point ('dest') of the connector
         * @param {String} type One of 'source' / 'dest'. Defaults to 'dest'
         * @returns {Array} The coordinates
         */
        getEndPointCoordinates(type = 'dest') {
            let sourceNodeIndex = this[`${type}Port`];
            let node = this[`${type}NodeObject`];
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
        },
        getSourceNodeExecutionState() {
            return this.streaming;
        },
        getHalfWayPosition() {
            // Add an offset to the actual middle point to make the text appear above the lines
            const topOffset = 13;
            let halfWay = [this.start[0] + (this.end[0] - this.start[0] - this.size.width) / 2,
                this.start[1] + (this.end[1] - this.start[1] - this.size.height) / 2 - topOffset];
            return halfWay;
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
      :class="{ variable: flowVariableConnection, 'read-only': !isWorkflowWritable,
                'dashed': getSourceNodeExecutionState()}"
      fill="none"
    />
    <foreignObject
      v-if="label.length > 0"
      :style="size"
      class="foreinObject"
      :transform="'translate(' + getHalfWayPosition()[0] + ',' + getHalfWayPosition()[1] + ')'"
    >
      <span class="textWrapper">
        <p
          ref="textContent"
          class="streamingLabel"
        >
          {{ label }}
        </p>
      </span>
    </foreignObject>
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

.foreinObject {
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.25);
  border-radius: 2px;
  background-color: var(--knime-masala);
}

.streamingLabel {
  color: white;
  font-size: 12px;
  display: flex;
  margin-block: 0;
  align-content: center;
}

.textWrapper {
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
