<script>
/* eslint-disable vue/require-default-prop */ // TODO: reevaluate after API-change NXT-228

import { mapState } from 'vuex';
import Port from '~/components/Port.vue';
import NodeState from '~/components/NodeState.vue';
import NodeSelect from '~/components/NodeSelect.vue';
import portShift from '~/util/portPosition';

export default {
    components: {
        Port,
        NodeState,
        NodeSelect
    },
    props: {
        inPorts: Array,
        name: String,
        nodeAnnotation: Object,
        nodeID: String,
        nodeState: Object,
        nodeType: String,
        outPorts: Array,
        progress: Object,
        selected: Boolean,
        type: String,
        uIInfo: Object,
        rootWorkflowID: String,

        deletable: Boolean,
        hasDialog: Boolean,
        inactive: Boolean,
        jobManager: Object,
        nodeFactoryKey: Object,
        nodeMessage: Object,
        parentNodeID: String,
        resetable: Boolean,
        webViewNames: Array
    },
    data() {
        let { x, y } = this.uIInfo.bounds;
        return {
            offset: [x, y],
            dragOffset: [0, 0],
            hover: false
        };
    },
    computed: {
        ...mapState('workflows', [
            'workflow'
        ]),
        incomingConnections() {
            // TODO: make this more efficient NXT-228
            const connections = this.workflow.connections;
            const incomingConnections = Object.values(connections).filter(connection => connection.dest === this.nodeID);
            return incomingConnections;
        },
        background() {
            return this.$colors.nodeBackgroundColors[this.nodeType] || this.$colors.nodeBackgroundColors.default;
        },
        visibleInports() {
            // TODO: change NXT-228
            return this.inPorts.filter(x => x.portName !== 'Variable Inport');
        },
        visibleOutports() {
            // TODO: change NXT-228
            return this.outPorts.filter(x => x.portName !== 'Variable Outport');
        },
        hasDefaultFlowVariablePortConnections() {
            const incoming = this.incomingConnections.some(connection => connection.destPort === 0);
            // TODO: implement check for outgoing connections NXT-228
            // TODO: make for efficient with new Gateway-API format NXT-228
            const outgoing = Object.values(this.workflow.connections).some(connection => connection.source === this.nodeID && connection.sourcePort === 0);
            return [incoming, outgoing];
        },
        combinedOffset() {
            return [this.offset[0] + this.dragOffset[0], this.offset[1] + this.dragOffset[1]];
        },
        hoverMargin() {
            // eslint-disable-next-line no-magic-numbers
            return [37, 10, 8, 10]; // margin around the node's square
        }
    },
    methods: {
        portShift,
        onLeaveHoverArea(e) {
            // only disable hover state if the mouse leaves the area of the node
            if (!this.$el.contains(e.relatedTarget)) { // will be true if the mouse moves over an element outside of this Node
                this.hover = false;
            }
        }
    }
};
</script>

<template>
  <g
    :transform="`translate(${combinedOffset[0]},${combinedOffset[1]})`"
    @mouseleave="onLeaveHoverArea"
    @mouseenter="hover=true"
  >
    <text
      class="name"
      y="-12"
      :x="$shapes.nodeSize / 2"
      text-anchor="middle"
    >
      {{ name }}
    </text>
 
    <rect
      class="hover-area"
      :width="$shapes.nodeSize+hoverMargin[1]+hoverMargin[3]"
      :height="$shapes.nodeSize+hoverMargin[0]+hoverMargin[2]"
      :x="-hoverMargin[1]"
      :y="-hoverMargin[0]"
      @mouseenter="hover=true"
      @mouseleave="onLeaveHoverArea"
    />

    <rect
      class="bg"
      :width="$shapes.nodeSize"
      :height="$shapes.nodeSize"
      rx="2"
      :style="{ fill: background }"
    />

    <Port
      v-if="hasDefaultFlowVariablePortConnections[0] || hover || selected"
      :connected="hasDefaultFlowVariablePortConnections[0]"
      :port="inPorts[0]"
      :x="-$shapes.portSize / 2"
      :y="-$shapes.portSize / 2"
    />

    <Port
      v-if="hasDefaultFlowVariablePortConnections[1] || hover || selected"
      :connected="hasDefaultFlowVariablePortConnections[1]"
      :port="outPorts[0]"
      :x="$shapes.nodeSize - $shapes.portSize / 2"
      :y="-$shapes.portSize / 2"
    />

    <Port
      v-for="port of visibleInports"
      :key="`inport-${port.portIndex}`"
      :port="port"
      :x="0"
      in-port
      :y="portShift(port.portIndex, inPorts.length)[1]"
    />

    <Port
      v-for="port of visibleOutports"
      :key="`outport-${port.portIndex}`"
      :port="port"
      :x="$shapes.nodeSize"
      :y="portShift(port.portIndex, outPorts.length)[1]"
    />

    <text
      class="annotation"
      :y="$shapes.nodeAnnotationMargin"
      x="0"
    >
      {{ nodeAnnotation.text }}
    </text>

    <NodeState :node-state="nodeState" />

    <portal
      v-if="selected || hover"
      to="node-select"
    >
      <NodeSelect
        :offset="combinedOffset"
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
  font-family: 'Roboto Condensed';
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
