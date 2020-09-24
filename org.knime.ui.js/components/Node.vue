<script>
import Port from '~/components/Port.vue';
import NodeState from '~/components/NodeState.vue';
import NodeTorso from '~/components/NodeTorso.vue';
import NodeSelect from '~/components/NodeSelect.vue';
import NodeAnnotation from '~/components/NodeAnnotation.vue';
import portShift from '~/util/portShift';

/**
 * A workflow node, including title, ports, node state indicator (traffic lights), selection frame and node annotation.
 * Must be embedded in an `<svg>` element.
 * Requires the `portal-vue` module.
 * */
export default {
    components: {
        Port,
        NodeAnnotation,
        NodeTorso,
        NodeState,
        NodeSelect
    },
    inheritAttrs: false,
    provide() {
        return {
            nodeId: this.id
        };
    },
    props: {
        /**
         * Node id, unique to the containing workflow
         */
        id: { type: String, required: true },

        /**
         * Node variation.
         * @values 'node', 'metanode', 'component'
         */
        kind: {
            type: String,
            required: true,
            validator: kind => ['node', 'metanode', 'component'].includes(kind)
        },

        /**
         * Input ports. List of configuration objects passed-through to the `Port` component
         */
        inPorts: { type: Array, required: true },
        /**
         * Output ports. List of configuration objects passed-through to the `Port` component
         */
        outPorts: { type: Array, required: true },


        position: {
            type: Object,
            required: true,
            validator: position => typeof position.x === 'number' && typeof position.y === 'number'
        },

        /**
         * Node annotation, displayed below the node
         */
        annotation: { type: Object, default: null },

        /**
         * Node name displayed above the node
         * Only for Component and Metanode
         */
        name: { type: String, default: null },

        /**
         * Node type, e.g. "Learner", "Visualizer"
         */
        type: { type: String, default: null },

        /**
         * data-url of icon to be displayed on the node's body
         * Only for Component but not required
         */
        icon: {
            type: String,
            default: null,
            validator: url => url.startsWith('data:image/')
        },

        /**
         * Node Execution State
         */
        state: {
            type: Object,
            validator(state) {
                return Reflect.has(state, 'executionState') || Object.keys(state).length === 0;
            },
            default: null
        }
    },
    data() {
        return {
            hover: false
        };
    },
    computed: {
        hoverMargin() {
            // margin around the node's square
            return [37, 10, 4, 10]; // eslint-disable-line no-magic-numbers
        }
    },
    methods: {
        portShift,
        onLeaveHoverArea(e) {
            // only disable hover state if the mouse leaves the area of the node
            if (!this.$el.querySelector('.hover-container').contains(e.relatedTarget)) {
                this.hover = false;
            }
        },

        // default flow variable ports (Mickey Mouse ears) are only shown if connected, or on hover
        showPort(port) {
            if (this.kind === 'metanode') {
                // Metanodes don't have Mickey Mouse ears, so port #0 is the first "real" port
                return true;
            }
            return port.index !== 0 || port.connectedVia.length || this.hover;
        }
    }
};
</script>

<template>
  <g
    :transform="`translate(${position.x}, ${position.y})`"
  >
    <NodeAnnotation
      v-if="annotation"
      v-bind="annotation"
      :y-shift="kind === 'metanode' ? 0 : $shapes.nodeStatusHeight + $shapes.nodeStatusMarginTop"
    />

    <g
      class="hover-container"
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

      <NodeTorso
        :type="type"
        :kind="kind"
        :icon="icon"
        :execution-state="state && state.executionState"
      />

      <template v-for="port of inPorts">
        <Port
          v-if="showPort(port)"
          :key="`inport-${port.index}`"
          :port="port"
          :x="portShift(port.index, inPorts.length, kind === 'metanode')[0]"
          :y="portShift(port.index, inPorts.length, kind === 'metanode')[1]"
        />
      </template>

      <template v-for="port of outPorts">
        <Port
          v-if="showPort(port)"
          :key="`outport-${port.index}`"
          :port="port"
          :x="portShift(port.index, outPorts.length, kind === 'metanode', true)[0]"
          :y="portShift(port.index, outPorts.length, kind === 'metanode', true)[1]"
        />
      </template>

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

    <NodeState
      v-if="kind !== 'metanode'"
      v-bind="state"
    />
  </g>
</template>

<style lang="postcss" scoped>
* {
  user-select: none;
}

.hover-area {
  fill: none;
  pointer-events: fill;
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
