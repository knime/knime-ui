<script>
import { mapState, mapMutations, mapActions } from 'vuex';
import Port from '~/components/PortWithTooltip';
import NodeState from '~/components/NodeState';
import NodeTorso from '~/components/NodeTorso';
import NodeAnnotation from '~/components/NodeAnnotation';
import LinkDecorator from '~/components/LinkDecorator';
import StreamingDecorator from '~/components/StreamingDecorator';
import portShift from '~/util/portShift';
import NodeActionBar from '~/components/NodeActionBar.vue';

/**
 * A workflow node, including title, ports, node state indicator (traffic lights), selection frame and node annotation.
 * Must be embedded in an `<svg>` element.
 * Requires the `portal-vue` module.
 *
 * If node is hovered default Flow Variable Ports are faded-in.
 * If node is selected, it will be portalled and redrawn. This causes the default Flow Variable Ports to appear
 * instantly, which is desired.
 * */
export default {
    components: {
        NodeActionBar,
        Port,
        NodeAnnotation,
        NodeTorso,
        NodeState,
        LinkDecorator,
        StreamingDecorator
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
         * Node selection state
         */
        selected: {
            type: Boolean,
            default: false
        },

        /**
         *  Props passed through to NodeActionBar
         */
        allowedActions: {
            type: Object,
            default: null
        },

        /**
         *  Information about the node execution. Might not be present if no special node execution info is available
         *  If given, usually only one of the following properties is set, either the icon, the 'streamble'-flag, or the job-manager
         */
        executionInfo: {
            type: Object,
            default: null
        },

        /**
         *  The node/workflow's job manager, if a special one is defined. Otherwise not given.
         */
        jobManager: {
            type: Object,
            default: null
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
        nodeSelectionMeasures() {
            const { nodeStatusHeight, nodeStatusMarginTop, nodeSize,
                nodeSelectionPadding: [top, right, bottom, left] } = this.$shapes;
            const hasStatusBar = this.kind !== 'metanode';

            return {
                y: -top,
                x: -left,
                height: (top + nodeSize + bottom) + (hasStatusBar ? nodeStatusHeight + nodeStatusMarginTop : 0),
                width: left + right + nodeSize
            };
        },
        /**
         * Checks if a streamable execution info has been set. The boolean value of the streamable variable does not matter,
         * as the presence of the variable already indicates that the node is inside of a streaming component
         * @return {boolean} if true action bar will be hidden
         */
        hideActionBar() {
            return typeof this.executionInfo?.streamable !== 'undefined';
        }
    },
    methods: {
        ...mapMutations('workflow', ['selectNode', 'deselectNode', 'deselectAllNodes']),
        ...mapActions('workflow', ['executeNodes', 'cancelNodeExecution', 'resetNodes']),
        portShift,
        onLeaveHoverArea(e) {
            if (this.$refs.actionbar?.$el?.contains(e.relatedTarget)) {
                // Used to test for elements that are logically contained inside this node
                // but aren't DOM-wise because they were teleported to another layer.
                // Currently only applies to ref 'actionbar'
                return;
            }

            // disable hover state if the mouse leaves the hover area of the node
            this.hover = false;
        },

        // default flow variable ports (Mickey Mouse ears) are only shown if connected, selected, or on hover
        showPort(port) {
            if (this.kind === 'metanode') {
                // Metanodes don't have Mickey Mouse ears, so port #0 is the first "real" port
                return true;
            }

            if (port.index !== 0) {
                // The port is not a Mickey Mouse ear
                return true;
            }

            return Boolean(port.connectedVia.length) || this.hover || this.selected;
        },

        onLeftDoubleClick(e) {
            // Ctrl key (Cmd key on mac) required to open component. Metanodes can be opened without keys
            if (this.kind === 'metanode' || (this.kind === 'component' && (e.ctrlKey || e.metaKey))) {
                this.openNode();
            }
        },

        openNode() {
            this.$store.dispatch('workflow/loadWorkflow', { workflowId: this.id, projectId: this.projectId });
        },

        /**
         * Triggered by NodeActionBar
         * @param {'executeNodes' | 'cancelNodeExecution' | 'resetNodes' } action
         * @returns {void}
         */
        onAction(action) {
            // calls actions of workflow store
            this[action]({ nodeIds: [this.id] });
        },

        /*
         * Left-Click         => Select only this node
         * Left-Click & Shift => Add/Remove this node to/from selection
         * Left-Click & Ctrl  => do Nothing
         */
        onLeftMouseDown(e) {
            if (e.ctrlKey || e.metaKey) {
                // user tries to open component or metanode
                return;
            }

            if (e.shiftKey) {
                // Multi select
                if (this.selected) {
                    this.deselectNode(this.id);
                } else {
                    this.selectNode(this.id);
                }
            } else {
                // Single select
                this.deselectAllNodes();
                this.selectNode(this.id);
            }
        }
    }
};
</script>

<template>
  <g
    :transform="`translate(${position.x}, ${position.y})`"
  >
    <!-- NodeActionBar portalled to the front-most layer -->
    <portal
      v-if="hover || selected"
      to="node-actions"
    >
      <NodeActionBar
        v-if="!hideActionBar"
        ref="actionbar"
        v-bind="allowedActions"
        :transform="`translate(${position.x + $shapes.nodeSize / 2} ${position.y - $shapes.nodeSelectionPadding[0]})`"
        :node-id="id"
        @action="onAction"
        @mouseleave.native="onLeaveHoverArea"
      />
    </portal>

    <!-- Node Selection Plane. Portalled to the back -->
    <portal
      v-if="selected"
      to="node-select"
    >
      <g :transform="`translate(${position.x}, ${position.y})`">
        <rect
          :y="nodeSelectionMeasures.y"
          :x="nodeSelectionMeasures.x"
          :width="nodeSelectionMeasures.width"
          :height="nodeSelectionMeasures.height"
          :fill="$colors.selection.activeBackground"
          :stroke="$colors.selection.activeBorder"
          stroke-width="1"
          rx="4"
        />
      </g>
    </portal>

    <!-- Annotation needs to be behind ports -->
    <NodeAnnotation
      v-if="annotation"
      v-bind="annotation"
      :y-shift="kind === 'metanode' ? 0 : $shapes.nodeStatusHeight + $shapes.nodeStatusMarginTop"
    />

    <!-- Node title. No pointer events -->
    <text
      class="name"
      :x="$shapes.nodeSize / 2"
      :y="-$shapes.nodeNameMargin"
      text-anchor="middle"
    >
      {{ name }}
    </text>

    <!-- Elements for which mouse hover triggers hover state -->
    <g
      ref="hoverContainer"
      class="hover-container"
      @mouseleave="onLeaveHoverArea"
      @mouseenter="hover = true"
    >
      <!-- Elements for which a click selects node -->
      <g @mousedown.left="onLeftMouseDown">
        <!-- Hover Area, larger than the node torso -->
        <rect
          class="hover-area"
          :width="$shapes.nodeSize + $shapes.nodeHoverMargin[1] + $shapes.nodeHoverMargin[3]"
          :height="$shapes.nodeSize + $shapes.nodeHoverMargin[0] + $shapes.nodeHoverMargin[2]"
          :x="-$shapes.nodeHoverMargin[1]"
          :y="-$shapes.nodeHoverMargin[0]"
        />
        <NodeTorso
          :type="type"
          :kind="kind"
          :icon="icon"
          :execution-state="state && state.executionState"
          :filter="(selected || hover) && 'url(#node-torso-shadow)'"
          @dblclick.left.native="onLeftDoubleClick"
        />

        <LinkDecorator
          v-if="link"
          :type="type"
          transform="translate(0, 21)"
        />

        <StreamingDecorator
          v-if="executionInfo"
          :type="type"
          :execution-info="executionInfo"
          transform="translate(21, 21)"
        />

        <NodeState
          v-if="kind !== 'metanode'"
          v-bind="state"
          :filter="(selected || hover) && 'url(#node-state-shadow)'"
        />
      </g>

      <template v-for="port of inPorts">
        <Port
          :key="`inport-${port.index}`"
          :class="['port', { hidden: !showPort(port) }]"
          :port="port"
          :x="portShift(port.index, inPorts.length, kind === 'metanode')[0]"
          :y="portShift(port.index, inPorts.length, kind === 'metanode')[1]"
        />
      </template>

      <template v-for="port of outPorts">
        <Port
          :key="`outport-${port.index}`"
          :class="['port', { hidden: !showPort(port) }]"
          :port="port"
          :x="portShift(port.index, outPorts.length, kind === 'metanode', true)[0]"
          :y="portShift(port.index, outPorts.length, kind === 'metanode', true)[1]"
        />
      </template>
    </g>
  </g>
</template>

<style lang="postcss" scoped>
* {
  user-select: none;
}

.port {
  opacity: 0;
  transition: opacity 0.5s 0.75s;

  &:not(.hidden) {
    opacity: 1;
  }

  &:hover {
    opacity: 1;
    transition: none;
  }
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
