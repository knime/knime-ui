<script>
import { mapActions, mapState, mapGetters } from 'vuex';
import DraggablePortWithTooltip from '~/components/DraggablePortWithTooltip.vue';
import NodeState from '~/components/NodeState';
import NodeTorso from '~/components/NodeTorso';
import NodeAnnotation from '~/components/NodeAnnotation';
import LinkDecorator from '~/components/LinkDecorator';
import StreamingDecorator from '~/components/StreamingDecorator';
import LoopDecorator from '~/components/LoopDecorator';
import portShift from '~/util/portShift';
import NodeActionBar from '~/components/NodeActionBar.vue';
import NodeSelectionPlane from '~/components/NodeSelectionPlane.vue';

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
        DraggablePortWithTooltip,
        NodeAnnotation,
        NodeTorso,
        NodeState,
        LinkDecorator,
        StreamingDecorator,
        LoopDecorator,
        NodeSelectionPlane
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

        /**
         * The position of the node. Contains of an x and a y parameter
         */
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
         *  Props passed through to NodeActionBar
         */
        allowedActions: {
            type: Object,
            default: () => ({})
        },

        /**
         *  Information about the node execution. Might not be present if no special node execution info is available
         *  If given, usually only one of the following properties is set, either the icon, the 'streamble'-flag, or the
         *  jobManager
         */
        executionInfo: {
            type: Object,
            validator(info) {
                return !info || Reflect.has(info, 'streamable') || info.jobManager || info.icon;
            },
            default: null
        },

        /**
         *  Loop specific configuration options
         *  @example:
         *    {
         *      allowedActions: {
         *        canResume: true,
         *        canStep: true,
         *        canPause: false
         *      },
         *      status: 'PAUSED'
         *    }
         */
        loopInfo: {
            type: Object,
            default: () => ({
                allowedActions: {}
            })
        }
    },
    data() {
        return {
            hover: false,
            connectorHover: false
        };
    },
    computed: {
        ...mapState('openedProjects', {
            projectId: 'activeId'
        }),
        ...mapGetters('selection', ['isNodeSelected']),
        ...mapState('workflow', ['isDragging']),
        decoratorBackgroundType() {
            if (this.type) {
                return this.type;
            }
            if (this.kind === 'component') {
                return 'Component';
            }
            if (this.kind === 'metanode') {
                return 'Metanode';
            }
            return null;
        },
        /**
         * Checks if a streamable execution info has been set. The boolean value of the streamable variable does not
         * matter, as the presence of the variable already indicates that the node is inside of a streaming component
         * @return {boolean} if true action bar will be hidden
         */
        insideStreamingComponent() {
            return typeof this.executionInfo?.streamable !== 'undefined' || this.isDragging;
        },
        allNodeActions() {
            return {
                ...this.allowedActions,
                ...this.loopInfo.allowedActions
            };
        },
        /**
         * Calculates the width of the hover area of the node.
         * The size increases when the node is hovered and either a dialog button or the view button is available,
         * so that all the action buttons are reachable.
         * @return {object} the size and position of the hover area of the node
         */
        hoverSize() {
            let extraHorizontalSize = 0;
            if (this.hover) {
                // buttons are showed as disabled if false, hidden if null
                if (typeof this.allowedActions.canOpenDialog === 'boolean') {
                    extraHorizontalSize += this.$shapes.nodeActionBarButtonSpread;
                }
                if (typeof this.allowedActions.canOpenView === 'boolean') {
                    extraHorizontalSize += this.$shapes.nodeActionBarButtonSpread;
                }
            }
            let width = this.$shapes.nodeSize + extraHorizontalSize +
                this.$shapes.nodeHoverMargin[1] + this.$shapes.nodeHoverMargin[3];
            let height = this.$shapes.nodeSize + this.$shapes.nodeHoverMargin[0] + this.$shapes.nodeHoverMargin[2];
            let x = -this.$shapes.nodeHoverMargin[1] - extraHorizontalSize / 2;
            let y = -this.$shapes.nodeHoverMargin[0];

            return {
                width,
                height,
                x,
                y
            };
        },
        /**
         * @returns {object} the position of all inPorts and outPorts.
         * The position for each port is an array with two coordinates [x, y].
         */
        portPositions() {
            return {
                in: this.inPorts.map(
                    port => portShift(port.index, this.inPorts.length, this.kind === 'metanode')
                ),
                out: this.outPorts.map(
                    port => portShift(port.index, this.outPorts.length, this.kind === 'metanode', true)
                )
            };
        }
    },
    methods: {
        ...mapActions('workflow', ['openDialog']),
        ...mapActions('selection', ['selectNode', 'deselectAllObjects', 'deselectNode']),
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

            return Boolean(port.connectedVia.length) || this.hover || this.isNodeSelected(this.id);
        },

        onLeftDoubleClick(e) {
            // Ctrl key (Cmd key on mac) required to open component. Metanodes can be opened without keys
            if (this.kind === 'metanode' || (this.kind === 'component' && (e.ctrlKey || e.metaKey))) {
                this.openNode();
            } else if (this.allowedActions?.canOpenDialog) {
                // open node dialog if one is present
                this.openDialog(this.id);
            }
        },

        openNode() {
            this.$store.dispatch('openedProjects/switchWorkflow', { workflowId: this.id, projectId: this.projectId });
        },
        /*
         * Left-Click         => Select only this node
         * Left-Click & Shift => Add/Remove this node to/from selection
         * Left-Click & Ctrl  => do Nothing
         */
        onLeftMouseClick(e) {
            if (this.isDragging) {
                return;
            }
            this.$refs.mouseClickable.focus();

            if (e.ctrlKey || e.metaKey) {
                // user tries to open component or metanode
                return;
            }
            if (e.shiftKey) {
                // Multi select
                if (this.isNodeSelected(this.id)) {
                    this.deselectNode(this);
                } else {
                    this.selectNode(this);
                }
            } else {
                // Single select
                this.deselectAllObjects();
                this.selectNode(this);
            }
        },
        /*
         * Right-Click             => Select only this node and show context menu (done in Kanvas.vue)
         * Right-Click & Shift     => Add/Remove this node to/from selection and show context menu (via Kanvas)
         * Right-Click & Ctrl/Meta => Do Nothing, also do not open the context menu
         *
         * We use the contextmenu event as click with button = 2 was not reliable.
         */
        onContextMenu(e) {
            if (this.isDragging) {
                return;
            }
            if (e.ctrlKey || e.metaKey) {
                // user tries to open component or metanode
                e.stopPropagation();
                return;
            }
            if (e.shiftKey) {
                // Multi select
                this.selectNode(this);
            } else if (!this.isNodeSelected(this.id)) {
                // single select
                this.deselectAllObjects();
                this.selectNode(this);
            }
        }
    }
};
</script>

<template>
  <g
    @connector-enter="connectorHover = true"
    @connector-leave="connectorHover = false"
  >
    <!-- NodeActionBar portalled to the front-most layer -->
    <portal
      to="node-actions"
    >
      <NodeActionBar
        v-if="!insideStreamingComponent && hover"
        ref="actionbar"
        v-bind="allNodeActions"
        :transform="`translate(${position.x + $shapes.nodeSize / 2} ${position.y - $shapes.nodeSelectionPadding[0]})`"
        :node-id="id"
        @mouseleave.native="onLeaveHoverArea"
      />
    </portal>

    <!-- Node Selection Plane. Portalled to the back -->
    <portal
      v-if="isNodeSelected(id) && !isDragging"
      to="node-select"
    >
      <NodeSelectionPlane
        :position="position"
        :kind="kind"
      />
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
      @contextmenu.prevent="onContextMenu"
    >
      <!-- Elements for which a click selects node -->
      <g
        ref="mouseClickable"
        class="mouse-clickable"
        tabindex="0"
        @click.left="onLeftMouseClick"
      >
        <!-- Hover Area, larger than the node torso -->
        <rect
          class="hover-area"
          :width="hoverSize.width"
          :height="hoverSize.height"
          :x="hoverSize.x"
          :y="hoverSize.y"
        />
        <NodeTorso
          :type="type"
          :kind="kind"
          :icon="icon"
          :execution-state="state && state.executionState"
          :filter="(isNodeSelected(id) || hover) && 'url(#node-torso-shadow)'"
          @dblclick.left.native="onLeftDoubleClick"
        />

        <LinkDecorator
          v-if="link"
          :background-type="decoratorBackgroundType"
          transform="translate(0, 21)"
        />

        <!-- Nodes contained in a component with a Streaming Job Manager get a little arrow or "x" to indicate their
        compatibility. Components with a Streaming Job Manager also get a little arrow.
        In both cases, the backend sets the `executionInfo` attribute. -->
        <StreamingDecorator
          v-if="executionInfo"
          :background-type="decoratorBackgroundType"
          :execution-info="executionInfo"
          transform="translate(21, 21)"
        />

        <LoopDecorator
          v-if="type === 'LoopStart' || type === 'LoopEnd'"
          :loop-status="loopInfo.status"
          transform="translate(20, 20)"
        />

        <NodeState
          v-if="kind !== 'metanode'"
          v-bind="state"
          :filter="(isNodeSelected(id) || hover) && 'url(#node-state-shadow)'"
          :loop-status="loopInfo.status"
        />
      </g>

      <DraggablePortWithTooltip
        v-for="port of inPorts"
        :key="`inport-${port.index}`"
        :class="['port', { hidden: !showPort(port), show: connectorHover }]"
        :relative-position="portPositions.in[port.index]"
        :port="port"
        :node-id="id"
        direction="in"
      />
      
      <DraggablePortWithTooltip
        v-for="port of outPorts"
        :key="`outport-${port.index}`"
        :class="['port', { hidden: !showPort(port), show: connectorHover }]"
        :relative-position="portPositions.out[port.index]"
        :port="port"
        :node-id="id"
        direction="out"
      />
    </g>
  </g>
</template>

<style lang="postcss" scoped>
* {
  user-select: none;
}

.port {
  opacity: 0;

  /* no delay when fading-out flowVar ports */
  transition: opacity 0.5s;

  &:not(.hidden) {
    opacity: 1;

    /* 0.5 seconds delay when showing flowVar ports, when node is hovered */
    transition: opacity 0.5s 0.5s;
  }

  &:hover {
    opacity: 1;

    /* immediately show flowVar ports on direct hover */
    transition: none;
  }

  &.show {
    opacity: 1;

    /* fade-in flowVar ports without delay on connectorHover */
    transition: opacity 0.25s;
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

.mouse-clickable:focus {
  outline: none;
}
</style>
