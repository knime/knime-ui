<script>
import { mapState, mapMutations, mapActions } from 'vuex';
import Port from '~/components/Port.vue';
import NodeState from '~/components/NodeState.vue';
import NodeTorso from '~/components/NodeTorso.vue';
import NodeSelect from '~/components/NodeSelect.vue';
import NodeAnnotation from '~/components/NodeAnnotation.vue';
import LinkDecorator from '~/components/LinkDecorator.vue';
import portShift from '~/util/portShift';
import NodeActionBar from '~/components/NodeActionBar.vue';

/**
 * A workflow node, including title, ports, node state indicator (traffic lights), selection frame and node annotation.
 * Must be embedded in an `<svg>` element.
 * Requires the `portal-vue` module.
 * */
export default {
    components: {
        NodeActionBar,
        Port,
        NodeAnnotation,
        NodeTorso,
        NodeState,
        NodeSelect,
        LinkDecorator
    },
    inheritAttrs: false,
    provide() {
        return {
            // Provide position as anchorPoint for tooltips
            anchorPoint: this.position
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
         * Path to the origin of a linked component or metanode
         */
        link: {
            type: String,
            default: null
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
        },

        /**
         * Iff node has been selected by user
         */
        selected: {
            type: Boolean,
            default: false
        },

        /**
         *  Passed through to NodeActionBar
         */
        allowedActions: {
            type: Object,
            default: () => {}
        }
    },
    data() {
        return {
            hover: false
        };
    },
    computed: {
        ...mapState('openedProjects', {
            projectId: 'activeId'
        }),
        sanitizedId() {
            /* For usage as CSS selector we need to remove colons */
            return this.id.replace(/:/g, '-');
        }
    },
    methods: {
        ...mapMutations('workflow', ['selectNodes']),
        ...mapActions('workflow', ['changeNodeState']),
        portShift,
        onLeaveHoverArea(e) {
            if (e.relatedTarget?.matches(`.${this.sanitizedId}-hover *`)) {
                // used to test for elements that are logically contained inside this node
                // but aren't DOM-wise because they were teleported to another layer
                // those elements need to have that class 'node-id-hover'
                return;
            }
            if (this.$el.querySelector('.hover-container').contains(e.relatedTarget)) {
                // test if the mouse leaves onto another element that is also contained inside this node's hover area
                return;
            }
                
            // disable hover state if the mouse leaves the hover area of the node
            this.hover = false;
        },

        // default flow variable ports (Mickey Mouse ears) are only shown if connected, or on hover
        showPort(port) {
            if (this.kind === 'metanode') {
                // Metanodes don't have Mickey Mouse ears, so port #0 is the first "real" port
                return true;
            }

            // the port is either not the 0th, is connected, the node is hovered or selected
            return port.index !== 0 || port.connectedVia.length || this.hover || this.selected;
        },

        onDoubleClick(e) {
            // Ctrl key (Cmd key on mac) required to open component. Metanodes can be opened without keys
            if (this.kind === 'metanode' || (this.kind === 'component' && (e.ctrlKey || e.metaKey))) {
                this.openNode();
            }
        },

        openNode() {
            this.$store.dispatch('workflow/loadWorkflow', { workflowId: this.id, projectId: this.projectId });
        },

        onAction(action) {
            // possible actions: 'reset', 'cancel', 'execute'
            this.changeNodeState({ nodeIds: [this.id], action });
        },

        select(e) {
            if (e.ctrlKey) {
                // user tries to open component or metanode
                return;
            }

            if (e.shiftKey) {
                // Multi select
                this.selectNodes({ nodeIds: [this.id], toggle: !this.selected });
            } else {
                // Single select
                this.selectNodes({ all: true, toggle: false });
                this.selectNodes({ nodeIds: [this.id] });
            }
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

    <!-- Elements for which mouse hover triggers hover state -->
    <g
      class="hover-container"
      @mouseleave="onLeaveHoverArea"
      @mouseenter="hover = true"
    >
      <!-- Elements for which a click selects node -->
      <g @mousedown.left="select">
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
          :width="$shapes.nodeSize + $shapes.nodeHoverMargin[1] + $shapes.nodeHoverMargin[3]"
          :height="$shapes.nodeSize + $shapes.nodeHoverMargin[0] + $shapes.nodeHoverMargin[2]"
          :x="-$shapes.nodeHoverMargin[1]"
          :y="-$shapes.nodeHoverMargin[0]"
        />
        
        <NodeTorso
          :class="{ hover: hover, selected: selected }"
          :type="type"
          :kind="kind"
          :icon="icon"
          :execution-state="state && state.executionState"
          :filter="(selected || hover) && 'url(#node-torso-shadow)'"
          @dblclick.native="onDoubleClick"
        />
        
        <LinkDecorator
          v-if="link"
          :type="type"
          transform="translate(0,21)"
        />

        <portal
          v-if="hover || selected"
          :to="`node-${ selected ? 'selected' : 'hover' }`"
        >
          <NodeSelect
            :x="position.x"
            :y="position.y"
            :has-status-bar="kind !== 'metanode'"
            :node-id="id"
            :active="selected"
          />
        </portal>

        <NodeState
          v-if="kind !== 'metanode'"
          v-bind="state"
          :class="['container', { hover: hover || selected }]"
          :filter="(selected || hover) && 'url(#node-state-shadow)'"
        />
      </g>

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
        v-if="hover || selected"
        to="node-actions"
      >
        <NodeActionBar
          :class="`${sanitizedId}-hover`"
          :transform="`translate(${position.x + $shapes.nodeSize / 2} ${position.y - $shapes.nodeSelectionPadding[0]})`"
          :execution-state="state && state.executionState"
          :allowed-actions="allowedActions"
          @action="onAction"
          @mouseleave.native="onLeaveHoverArea"
        />
      </portal>
    </g>
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
  font-size: 15px;
  line-height: 17px;
}

.annotation {
  font-size: 10px;
  line-height: 12px;
  pointer-events: none;
  width: 125px;
}
</style>
