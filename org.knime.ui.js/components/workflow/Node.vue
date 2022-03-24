<script>
import { mapActions, mapState, mapGetters } from 'vuex';
import DraggablePortWithTooltip from '~/components/workflow/DraggablePortWithTooltip';
import NodeState from '~/components/workflow/NodeState';
import NodeTorso from '~/components/workflow/NodeTorso';
import NodeAnnotation from '~/components/workflow/NodeAnnotation';
import LinkDecorator from '~/components/workflow/LinkDecorator';
import StreamingDecorator from '~/components/workflow/StreamingDecorator';
import LoopDecorator from '~/components/workflow/LoopDecorator';
import portShift from '~/util/portShift';
import NodeActionBar from '~/components/workflow/NodeActionBar';
import NodeSelectionPlane from '~/components/workflow/NodeSelectionPlane';
import NodeName from '~/components/workflow/NodeName';
import NodeNameEditorActionBar from '~/components/workflow/NodeNameEditorActionBar';
import { snapConnector } from '~/mixins';
import NodeNameEditor from './NodeNameEditor';

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
        NodeNameEditor,
        NodeActionBar,
        DraggablePortWithTooltip,
        NodeAnnotation,
        NodeTorso,
        NodeState,
        LinkDecorator,
        StreamingDecorator,
        LoopDecorator,
        NodeName,
        NodeNameEditorActionBar,
        NodeSelectionPlane
    },
    mixins: [snapConnector],
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
                // TODO: NXT-845 document and improve this validator
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
            nameEditorOpen: false,
            nameWidth: 0,
            nameHeight: 20,
            currentName: this.name,
            showSelectionPreview: null
        };
    },
    computed: {
        ...mapState('application', {
            projectId: 'activeProjectId'
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
        selectionWidth() {
            return this.nameWidth + (this.$shapes.nodeNameHorizontalMargin * 2);
        },
        /**
         * Checks if a streamable execution info has been set. The boolean value of the streamable variable does not
         * matter, as the presence of the variable already indicates that the node is inside of a streaming component
         * @return {boolean} if true action bar will be hidden
         */
        insideStreamingComponent() {
            // TODO: NXT-740 isDragging in this condition doesn't fit the function name.
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
            let hoverBounds = {
                top: -this.$shapes.nodeHoverMargin[0],
                left: -this.$shapes.nodeHoverMargin[1],
                bottom: this.$shapes.nodeSize + this.$shapes.nodeHoverMargin[2],
                right: this.$shapes.nodeSize + this.$shapes.nodeHoverMargin[3]
            };

            if (this.hover) {
                // buttons are shown as disabled if false, hidden if null

                let extraHorizontalSpace = 0;
                if ('canOpenDialog' in this.allowedActions) {
                    extraHorizontalSpace += this.$shapes.nodeActionBarButtonSpread;
                }
                if ('canOpenView' in this.allowedActions) {
                    extraHorizontalSpace += this.$shapes.nodeActionBarButtonSpread;
                }
                hoverBounds.left -= extraHorizontalSpace / 2;
                hoverBounds.right += extraHorizontalSpace / 2;
            }
            if (this.connectorHover || this.hover) {
                // enlargen hover area to include all ports
                let newBottom = Math.max(hoverBounds.bottom, this.portBarHeight);
                hoverBounds.bottom = newBottom;
            }

            return {
                y: hoverBounds.top,
                x: hoverBounds.left,
                width: hoverBounds.right - hoverBounds.left,
                height: hoverBounds.bottom - hoverBounds.top
            };
        },
        /**
         * @returns {object} the position of all inPorts and outPorts.
         * The position for each port is an array with two coordinates [x, y].
         * Format as required by snapConnector mixin
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
        },
        portBarHeight() {
            let lastInPortY = this.portPositions.in[this.portPositions.in.length - 1]?.[1] || 0;
            let lastOutPortY = this.portPositions.out[this.portPositions.out.length - 1]?.[1] || 0;

            return Math.max(lastInPortY, lastOutPortY) + this.$shapes.portSize / 2 +
                this.$shapes.nodeHoverPortBottomMargin;
        },
        showSelectionPlane() {
            const isSelected = this.isNodeSelected(this.id);
            // no preview, honor dragging state
            if (this.showSelectionPreview === null) {
                return isSelected && !this.isDragging;
            }
            // preview can override selected state (think: deselect with shift)
            if (isSelected && this.showSelectionPreview === 'hide') {
                return false;
            }
            return this.showSelectionPreview === 'show' || isSelected;
        },
        nameIsEditable() {
            // only metanodes and components have editable names
            return ['metanode', 'component'].includes(this.kind);
        },
        actionBarPosition() {
            return {
                x: this.position.x + this.$shapes.nodeSize / 2,
                y: this.position.y - this.$shapes.nodeSelectionPadding[0] - this.nameHeight
            };
        }
    },
    watch: {
        name(newValue) {
            this.currentName = newValue;
        },
        nameHeight(newValue) {
            this.$parent.$emit('node-selection-plane-extra-height-changed', newValue);
        },
        selectionWidth(newValue) {
            this.$parent.$emit('node-selection-plane-width-changed', newValue);
        }
    },
    methods: {
        ...mapActions('workflow', ['openDialog', 'updateComponentOrMetanodeName']),
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

        saveNameEdit() {
            this.updateComponentOrMetanodeName({ nodeId: this.id, name: this.currentName });
            this.nameEditorOpen = false;
        },

        cancelNameEdit() {
            this.currentName = this.name;
            this.nameEditorOpen = false;
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

            return Boolean(port.connectedVia.length) || this.hover;
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
            this.$store.dispatch('application/switchWorkflow', { workflowId: this.id, projectId: this.projectId });
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
                    this.deselectNode(this.id);
                } else {
                    this.selectNode(this.id);
                }
            } else {
                // Single select
                this.deselectAllObjects();
                this.selectNode(this.id);
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
                this.selectNode(this.id);
            } else if (!this.isNodeSelected(this.id)) {
                // single select
                this.deselectAllObjects();
                this.selectNode(this.id);
            }
        },
        // implemented as required by snapConnector mixin
        isOutsideConnectorHoverRegion(x, y, targetPortDirection) {
            const upperBound = -20;

            if (y < upperBound) { return true; }
            if (targetPortDirection === 'in' && x > this.$shapes.nodeSize) { return true; }
            if (targetPortDirection === 'out' && x < 0) { return true; }

            return false;
        },
        // public
        setSelectionPreview(show) {
            this.showSelectionPreview = show === 'clear' ? null : show;
        }
    }
};
</script>

<template>
  <g :class="{'connection-forbidden': connectionForbidden && !isConnectionSource}">
    <!-- NodeActionBar portalled to the front-most layer -->
    <portal
      to="node-actions"
    >
      <NodeActionBar
        v-if="!insideStreamingComponent && hover"
        ref="actionbar"
        v-bind="allNodeActions"
        :transform="`translate(${actionBarPosition.x}, ${actionBarPosition.y})`"
        :node-id="id"
        @mouseleave.native="onLeaveHoverArea"
      />
    </portal>

    <!-- Node Selection Plane. Portalled to the back -->
    <portal
      to="node-select"
    >
      <NodeSelectionPlane
        v-show="showSelectionPlane"
        :position="position"
        :width="selectionWidth"
        :extra-height="nameHeight"
        :kind="kind"
      />
    </portal>

    <!-- Annotation needs to be behind ports -->
    <NodeAnnotation
      v-if="annotation"
      v-bind="annotation"
      :y-shift="kind === 'metanode' ? 0 : $shapes.nodeStatusHeight + $shapes.nodeStatusMarginTop"
    />

    <!-- Elements for which mouse hover triggers hover state -->
    <g
      ref="hoverContainer"
      class="hover-container"
      @mouseleave="onLeaveHoverArea"
      @mouseenter="hover = true"
      @contextmenu.prevent="onContextMenu"
      @connector-enter.stop="onConnectorEnter"
      @connector-leave.stop="onConnectorLeave"
      @connector-move.stop="onConnectorMove"
      @connector-drop.stop="onConnectorDrop"
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
          :filter="hover && 'url(#node-torso-shadow)'"
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
        <!-- TODO: NXT-832 Currently there is no test/example-workflow to test this case in action -->
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
          :filter="hover && 'url(#node-state-shadow)'"
          :loop-status="loopInfo.status"
          :transform="`translate(0, ${$shapes.nodeSize + $shapes.nodeStatusMarginTop})`"
        />
      </g>

      <DraggablePortWithTooltip
        v-for="port of inPorts"
        :key="`inport-${port.index}`"
        :class="['port', { hidden: !showPort(port), 'force-show': connectorHover }]"
        :relative-position="portPositions.in[port.index]"
        :port="port"
        :node-id="id"
        :targeted="targetPort && targetPort.side === 'in' && targetPort.index === port.index"
        direction="in"
      />

      <DraggablePortWithTooltip
        v-for="port of outPorts"
        :key="`outport-${port.index}`"
        :class="['port', { hidden: !showPort(port), 'force-show': connectorHover }]"
        :relative-position="portPositions.out[port.index]"
        :port="port"
        :node-id="id"
        :targeted="targetPort && targetPort.side === 'out' && targetPort.index === port.index"
        direction="out"
      />
    </g>

    <!-- Node name / title -->
    <portal
      v-if="nameEditorOpen"
      to="node-title-editor"
    >
      <!-- Block all inputs to the kanvas -->
      <rect
        width="100%"
        height="100%"
        x="0"
        y="0"
        fill="transparent"
        @pointerdown.stop.prevent
        @click.stop.prevent
      />
      <NodeNameEditorActionBar
        :transform="`translate(${actionBarPosition.x}, ${actionBarPosition.y - 5 })`"
        @save="saveNameEdit"
        @close="cancelNameEdit"
      />
      <!-- Node name inline editor -->
      <NodeNameEditor
        v-model="currentName"
        :transform="`translate(${position.x}, ${position.y})`"
        @width="nameWidth = $event"
        @height="nameHeight = $event"
        @save="saveNameEdit"
        @close="cancelNameEdit"
      />
    </portal>
    <NodeName
      v-else
      :value="name"
      :editable="nameIsEditable"
      @click="onLeftMouseClick"
      @contextmenu="onContextMenu"
      @width="nameWidth = $event"
      @height="nameHeight = $event"
      @request-edit="nameEditorOpen = true; hover = false;"
      @mouseenter="hover = true"
      @mouseleave="onLeaveHoverArea"
    />
  </g>
</template>

<style lang="postcss" scoped>
* {
  user-select: none;
}

.hover-container {
  transition: filter 0.4s;
}

.connection-forbidden .hover-container {
  filter: grayscale(40%) opacity(50%);
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

  &.force-show {
    opacity: 1;

    /* fade-in flowVar ports without delay on connectorHover */
    transition: opacity 0.25s;
  }
}

.hover-area {
  fill: none;
  pointer-events: fill;
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
