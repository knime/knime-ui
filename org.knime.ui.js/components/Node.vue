<script>
import { mapState } from 'vuex';
import Port from '~/components/Port.vue';
import NodeState from '~/components/NodeState.vue';
import NodeTorso from '~/components/NodeTorso.vue';
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
        NodeTorso,
        NodeState,
        NodeSelect
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
        kind: { type: String, required: true, validator: kind => ['node', 'metanode', 'component'].includes(kind) },

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
         * References a Node template
         * Only for native nodes
         */
        templateId: { type: String, default: null },

        /**
         * Node type, e.g. "Learner", "Visualizer"
         * Only for Component
         */
        type: { type: String, default: null },

        /**
         * data-url of icon to be displayed on the node's body
         * Only for Component but not required
         */
        icon: { type: String, default: null, validator: url => url.startsWith('data:image/') },

        /**
         * Node Execution State
         * Only for Native and Component
         */
        // TODO NXT-223: use that state
        state: { type: Object, default: null }
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
        hoverMargin() {
            // margin around the node's square
            return [37, 10, 8, 10]; // eslint-disable-line no-magic-numbers
        },

        /**
         * native nodes reference a node template that contains static information like icon, name and type
         * @returns {Object | null} node template
         */
        template() {
            if (this.kind !== 'node') { return null; }

            const template = this.workflow.nodeTemplates[this.templateId];
            if (!template) { throw new Error(`template not found ${this.templateId}`); }

            return template;
        }
    },
    methods: {
        portShift,
        onLeaveHoverArea(e) {
            // only disable hover state if the mouse leaves the area of the node
            if (!this.$el.contains(e.relatedTarget)) {
                this.hover = false;
            }
        },
        
        // default flow variable input ports (Mickey Mouse ears) are only shown if connected, or on hover
        showPort(port) {
            if (this.kind === 'metanode') { return true; } // Metanodes don't have Mickey Mouse ears
            return port.index !== 0 || port.connectedVia.length || this.hover;
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
      {{ template && template.name || name }}
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
      :type="template && template.type || type"
      :kind="kind"
      :icon="template && template.icon || icon"
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

    <text
      v-if="annotation"
      class="annotation"
      :y="$shapes.nodeSize + $shapes.nodeAnnotationMargin"
      :x="$shapes.nodeSize / 2"
      text-anchor="middle"
    >
      {{ annotation.text }}
    </text>

    <NodeState
      v-if="kind !== 'metanode'"
      v-bind="state"
    />

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
