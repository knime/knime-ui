<script>
import { mapState } from 'vuex';
import Port from '~/components/Port.vue';
import NodeState from '~/components/NodeState.vue';
import NodeSelect from '~/components/NodeSelect.vue';
import portShift from '~/util/portShift';

export default {
    components: {
        Port,
        NodeState,
        NodeSelect
    },
    props: {
        name: { type: String, required: true },
        nodeID: { type: String, required: true },
        rootWorkflowID: { type: String, required: true },
        parentNodeID: { type: String, required: true },
        
        nodeType: { type: String, required: true },
        type: { type: String, required: true },
        uIInfo: { type: Object, required: true },
        nodeAnnotation: { type: Object, required: true },
        
        inactive: { type: Boolean, required: true },
        deletable: { type: Boolean, required: true },
        hasDialog: { type: Boolean, required: true },
        resetable: { type: Boolean, required: true },
        selected: { type: Boolean, required: true },

        inPorts: { type: Array, required: true },
        outPorts: { type: Array, required: true },
        
        nodeState: { type: Object, required: true },
        progress: { type: Object, required: true },
        nodeMessage: { type: Object, required: true },
                
        jobManager: { type: Object, required: true },
        nodeFactoryKey: { type: Object, required: true },
        webViewNames: { type: Array, required: true }
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
            return Object.values(connections).filter(connection => connection.dest === this.nodeID);
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
            const outgoing = Object.values(this.workflow.connections).some(
                connection => connection.source === this.nodeID && connection.sourcePort === 0
            );
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
      :x="$shapes.portSize / 2"
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
