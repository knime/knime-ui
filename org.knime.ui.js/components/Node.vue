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
        id: { type: String, required: true },

        /**
         * Node type, e.g. "Learner", "Visualizer", "Component"
         * Is undefined for MetaNodes
         */
        type: { type: String, required: false },

        position: { type: Object, required: true },
        
        /**
         * Node annotation, displayed below the node
         */
        annotation: { type: Object, required: false },

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
        return {
            hover: false
        };
    },
    computed: {
        ...mapState('workflows', [
            'workflow'
        ]),
        background() {
            return this.$colors.nodeBackgroundColors[this.type] || this.$colors.nodeBackgroundColors.default;
        },
        hasDefaultFlowVariablePortConnections() {
            const incoming = this.inPorts[0] && this.inPorts[0].connectedVia.length;
            const outgoing = this.outPorts[0] && this.outPorts[0].connectedVia.length;
            
            return [incoming, outgoing];
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
    :transform="`translate(${position.x}, ${position.y})`"
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
        v-if="port.index !== 0 || hasDefaultFlowVariablePortConnections[0] || hover"
        :key="`inport-${port.index}`"
        :port="port"
        :x="portShift(port.index, inPorts.length)[0] - $shapes.portSize"
        :y="portShift(port.index, inPorts.length)[1]"
      />
    </template>

    <template v-for="port of outPorts">
      <Port
        v-if="port.index !== 0 || hasDefaultFlowVariablePortConnections[1] || hover"
        :key="`outport-${port.index}`"
        :port="port"
        :x="$shapes.nodeSize - portShift(port.index, outPorts.length)[0]"
        :y="portShift(port.index, outPorts.length)[1]"
      />
    </template>

    <text
      v-if="annotation"
      class="annotation"
      :y="$shapes.nodeSize + $shapes.nodeAnnotationMargin"
      :x="$shapes.nodeSize / 2"
      text-anchor="middle"
    >
      {{ annotation.text }}
    </text>

    <NodeState />

    <portal
      v-if="hover"
      to="node-select"
    >
      <NodeSelect
        :x="position.x"
        :y="position.y"
        :node-id="id"
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
