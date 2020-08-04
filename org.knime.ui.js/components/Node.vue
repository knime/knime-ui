<script>
import { mapState } from 'vuex';
import Port from '~/components/Port.vue';
import NodeState from '~/components/NodeState.vue';
import NodeSelect from '~/components/NodeSelect.vue';
import portShift from '~/util/portShift';

/**
 * A workflow node, including title, ports, node state indicator (traffic lights), selection frame and node annotation.
 * Must be embedded in an `<svg>` element.
 * Requires the `portal-vue` module.
 * */
export default {
    components: {
        Port,
        NodeState,
        NodeSelect
    },
    props: {
        /**
         * Node name displayed above the node
         */
        name: { type: String, required: true },
        /**
         * Node id, unique to the containing workflow
         */
        nodeID: { type: String, required: true },

        /**
         * Node type, e.g. "Learner", "Visualizer", "Component"
         */
        nodeType: { type: String, required: true },
        uIInfo: { type: Object, required: true },
        /**
         * Node annotation, displayed below the node
         */
        nodeAnnotation: { type: Object, required: true },

        /**
         * Input ports. List of configuration objects passed-through to the `Port` component
         */
        inPorts: { type: Array, required: true },
        /**
         * Output ports. List of configuration objects passed-through to the `Port` component
         */
        outPorts: { type: Array, required: true }
    },
    data() {
        let { x, y } = this.uIInfo.bounds;
        return {
            offset: [x, y],
            hover: false
        };
    },
    computed: {
        ...mapState('workflows', [
            'workflow'
        ]),
        background() {
            return this.$colors.nodeBackgroundColors[this.nodeType] || this.$colors.nodeBackgroundColors.default;
        },
        hasDefaultFlowVariablePortConnections() {
            // TODO: increase efficiency with new Gateway-API format NXT-228
            const connections = this.workflow.connections;
            const incomingConnections = Object.values(connections).filter(connector => connector.dest === this.nodeID);

            const incomingFlowVars = incomingConnections.some(connection => connection.destPort === 0);
            const outgoingFlowVars = Object.values(this.workflow.connections).some(
                connection => connection.source === this.nodeID && connection.sourcePort === 0
            );
            return [incomingFlowVars, outgoingFlowVars];
        },
        hoverMargin() {
            // margin around the node's square
            return [37, 10, 8, 10]; // eslint-disable-line no-magic-numbers
        }
    },
    methods: {
        portShift,
        onLeaveHoverArea(e) {
            // only disable hover state if the mouse leaves the area of the node
            if (!this.$el.contains(e.relatedTarget)) {
                this.hover = false;
            }
        }
    }
};
</script>

<template>
  <g
    :transform="`translate(${offset[0]}, ${offset[1]})`"
    @mouseleave="onLeaveHoverArea"
    @mouseenter="hover = true"
  >
    <text
      class="name"
      :x="$shapes.nodeSize / 2"
      :y="-$shapes.nodeNameMargin"
      text-anchor="middle"
    >
      {{ name }}
    </text>

    <rect
      class="hover-area"
      :width="$shapes.nodeSize + hoverMargin[1] + hoverMargin[3]"
      :height="$shapes.nodeSize + hoverMargin[0] + hoverMargin[2]"
      :x="-hoverMargin[1]"
      :y="-hoverMargin[0]"
      @mouseenter="hover = true"
      @mouseleave="onLeaveHoverArea"
    />

    <rect
      class="bg"
      :width="$shapes.nodeSize"
      :height="$shapes.nodeSize"
      :fill="background"
      rx="2"
    />

    <template v-for="port of inPorts">
      <Port
        v-if="port.portIndex !== 0 || hasDefaultFlowVariablePortConnections[0] || hover"
        :key="`inport-${port.portIndex}`"
        :port="port"
        :x="portShift(port.portIndex, inPorts.length)[0]"
        :y="portShift(port.portIndex, inPorts.length)[1]"
      />
    </template>

    <template v-for="port of outPorts">
      <Port
        v-if="port.portIndex !== 0 || hasDefaultFlowVariablePortConnections[1] || hover"
        :key="`outport-${port.portIndex}`"
        :port="port"
        :x="$shapes.nodeSize - portShift(port.portIndex, outPorts.length)[0]"
        :y="portShift(port.portIndex, outPorts.length)[1]"
      />
    </template>

    <text
      class="annotation"
      :y="$shapes.nodeAnnotationMargin"
      :x="$shapes.nodeSize / 2"
      text-anchor="middle"
    >
      {{ nodeAnnotation.text }}
    </text>

    <NodeState />

    <portal
      v-if="hover"
      to="node-select"
    >
      <NodeSelect
        :offset="offset"
        :node-i-d="nodeID"
      />
    </portal>
  </g>
</template>

<style scoped>
* {
  user-select: none;
}

.hover-area {
  fill: none;
  pointer-events: fill;
}

.bg {
  cursor: grab;
}

.name {
  pointer-events: none;
  font-family: "Roboto Condensed", sans-serif;
  font-style: normal;
  font-weight: bold;
  font-size: 12px;
  line-height: 14px;
}

.annotation {
  font-size: 10px;
  line-height: 12px;
  pointer-events: none;
  width: 125px;
}
</style>
