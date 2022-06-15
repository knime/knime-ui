<script>
/* eslint-disable max-lines */
// TODO: NXT-1069 split up this file

import { mapActions, mapState, mapGetters } from 'vuex';
import DraggablePortWithTooltip from '~/components/workflow/DraggablePortWithTooltip';
import NodeState from '~/components/workflow/NodeState';
import NodeTorso from '~/components/workflow/NodeTorso';
import NodeAnnotation from '~/components/workflow/NodeAnnotation';
import LinkDecorator from '~/components/workflow/LinkDecorator';
import StreamingDecorator from '~/components/workflow/StreamingDecorator';
import LoopDecorator from '~/components/workflow/LoopDecorator';
import portShift, { placeholderPosition, portPositions } from '~/util/portShift';
import NodeActionBar from '~/components/workflow/NodeActionBar';
import NodeSelectionPlane from '~/components/workflow/NodeSelectionPlane';
import NodeName from '~/components/workflow/NodeName';
import AddPortPlaceholder from '~/components/workflow/AddPortPlaceholder';
import { snapConnector } from '~/mixins';

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
        NodeName,
        NodeSelectionPlane,
        AddPortPlaceholder
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
            selectionPreview: null,
            nameDimensions: {
                width: 0,
                height: 20
            }
        };
    },
    computed: {
        ...mapState('application', { projectId: 'activeProjectId' }),
        ...mapState('workflow', ['isDragging']),
        ...mapGetters('selection', ['isNodeSelected', 'singleSelectedNode']),
        ...mapGetters('workflow', ['isWritable']),
        decoratorBackgroundType() {
            if (this.type) {
                return this.type;
            } else {
                // uppercase first letter of kind (metanode or component)
                return this.kind[0].toUpperCase() + this.kind.substring(1);
            }
        },
        /**
         * Width of the node selection plane. It accounts not only for the node margins
         * but also for the width of the name as it changes
         * @return {boolean}
         */
        selectionWidth() {
            return this.nameDimensions.width + (this.$shapes.nodeNameHorizontalMargin * 2);
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
            
            // adjust upper hover bounds to node name
            hoverBounds.top -= this.nameDimensions.height;

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
                // enlarge hover area to include all ports
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
                in: portPositions(
                    { portCount: this.inPorts.length, isMetanode: this.kind === 'metanode' }
                ),
                out: portPositions(
                    { portCount: this.outPorts.length, isMetanode: this.kind === 'metanode', isOutports: true }
                )
            };
        },
        addPortPlaceholderPositions() {
            return {
                in: placeholderPosition(
                    { portCount: this.inPorts.length, isMetanode: this.kind === 'metanode' }
                ),
                out: placeholderPosition(
                    { portCount: this.outPorts.length, isMetanode: this.kind === 'metanode', isOutport: true }
                )
            };
        },
        portBarHeight() {
            let lastInPortY = this.portPositions.in[this.portPositions.in.length - 1]?.[1] || 0;
            let lastOutPortY = this.portPositions.out[this.portPositions.out.length - 1]?.[1] || 0;

            return Math.max(lastInPortY, lastOutPortY) + this.$shapes.portSize / 2 +
                this.$shapes.nodeHoverPortBottomMargin;
        },
        isSelected() {
            return this.isNodeSelected(this.id);
        },
        isSingleSelected() {
            return this.singleSelectedNode?.id === this.id;
        },
        showSelectionPlane() {
            // no preview, honor dragging state
            if (this.selectionPreview === null) {
                return this.isSelected && !this.isDragging;
            }
            
            // preview can override selected state (think: deselect with shift)
            if (this.isSelected && this.selectionPreview === 'hide') {
                return false;
            }

            return this.selectionPreview === 'show' || this.isSelected;
        },
        isEditableContainerNode() {
            // only non-linked metanodes and components have editable names
            return this.isWritable && ['metanode', 'component'].includes(this.kind) && this.link === null;
        },
        actionBarPosition() {
            return {
                x: this.position.x + this.$shapes.nodeSize / 2,
                y: this.position.y - this.$shapes.nodeSelectionPadding[0] - this.nameDimensions.height
            };
        }
    },
    methods: {
        ...mapActions('workflow', ['openNodeConfiguration']),
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
        portAnimationClasses(port) {
            let isMickeyMousePort = this.kind !== 'metanode' && port.index === 0;

            if (!isMickeyMousePort) { return {}; }
            
            return {
                'mickey-mouse': true,
                'connector-hover': this.connectorHover,
                'connected': port.connectedVia.length, // eslint-disable-line quote-props
                'node-hover': this.hover
            };
        },
        
        onLeftDoubleClick(e) {
            // Ctrl key (Cmd key on mac) required to open component. Metanodes can be opened without keys
            if (this.kind === 'metanode' || (this.kind === 'component' && (e.ctrlKey || e.metaKey))) {
                this.openContainerNode();
            } else if (this.allowedActions?.canOpenDialog) {
                // open node dialog if one is present
                this.openNodeConfiguration(this.id);
            }
        },

        openContainerNode() {
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
            if (this.isDragging) { return; }
            
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
        onPortTypeMenuOpen(e) {
            // show add-port button
            e.target.style.opacity = 1;

            // clear the close-timeout of this button if set
            clearTimeout(e.target.closeTimeout);
        },
        onPortTypeMenuClose(e) {
            // after closing the menu, keep the add-port button for 1s,
            // then go back to styling by css
            e.target.closeTimeout = setTimeout(() => {
                e.target.style.opacity = null;
            }, 1000);
        },
        // public
        setSelectionPreview(preview) {
            this.selectionPreview = preview === 'clear' ? null : preview;
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
        :extra-height="nameDimensions.height"
        :kind="kind"
      />
    </portal>

    <!-- Annotation needs to be behind ports -->
    <NodeAnnotation
      v-if="annotation && annotation.text"
      v-bind="annotation"
      :y-offset="kind === 'metanode' ? 0 : $shapes.nodeStatusHeight + $shapes.nodeStatusMarginTop"
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
        :class="['port', portAnimationClasses(port)]"
        :relative-position="portPositions.in[port.index]"
        :port="port"
        :node-id="id"
        :targeted="targetPort && targetPort.side === 'in' && targetPort.index === port.index"
        direction="in"
      />

      <DraggablePortWithTooltip
        v-for="port of outPorts"
        :key="`outport-${port.index}`"
        :class="['port', portAnimationClasses(port)]"
        :relative-position="portPositions.out[port.index]"
        :port="port"
        :node-id="id"
        :targeted="targetPort && targetPort.side === 'out' && targetPort.index === port.index"
        direction="out"
      />

      <AddPortPlaceholder
        v-if="isEditableContainerNode"
        :node-id="id"
        :position="addPortPlaceholderPositions.in"
        :class="['add-port', {
          'node-hover': hover,
          'connector-hover': connectorHover,
          'node-selected': isSingleSelected,
        }]"
        side="input"
        @open-port-type-menu.native="onPortTypeMenuOpen($event)"
        @close-port-type-menu.native="onPortTypeMenuClose($event)"
      />

      <AddPortPlaceholder
        v-if="isEditableContainerNode"
        :node-id="id"
        :position="addPortPlaceholderPositions.out"
        :class="['add-port', {
          'node-hover': hover,
          'connector-hover': connectorHover,
          'node-selected': isSingleSelected,
        }]"
        side="output"
        @open-port-type-menu.native="onPortTypeMenuOpen($event)"
        @close-port-type-menu.native="onPortTypeMenuClose($event)"
      />

      <!-- Node name / title -->
      <NodeName
        :node-id="id"
        :node-position="position"
        :value="name"
        :editable="isEditableContainerNode"
        @click.native.left="onLeftMouseClick"
        @contextmenu.prevent="onContextMenu"
        @width-change="nameDimensions.width = $event"
        @height-change="nameDimensions.height = $event"
        @edit-start="hover = false"
        @connector-enter.native.stop="onConnectorEnter"
        @connector-leave.native.stop="onConnectorLeave"
      />
    </g>
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
  transition: transform 120ms ease;

  &.mickey-mouse {
    /* TODO: NXT-1058 why is this transition no applied when the .connected class is removed? */
    opacity: 0;
    transition: opacity 0.5s 0.25s;

    &.node-hover {
      /* fade-in port with delay when node is hovered */
      transition: opacity 0.5s 0.5s;
      opacity: 1;
    }

    &:hover {
      /* immediately show port on direct hover */

      /* TODO: NXT-1058 why is "transition: opacity 0;" not working? */
      transition: none;
      opacity: 1;
    }

    &.connector-hover {
      /* fade-in port without delay on connectorHover */
      transition: opacity 0.25s;
      opacity: 1;
    }

    &.connected {
      /* fade in port when a connection has been created */
      transition: opacity 0.25s;
      opacity: 1;
    }
  }
}

.add-port {
  opacity: 0;
  transition:
    opacity 0.2s,
    transform 120ms ease-out;

  &.node-selected,
  &.node-hover {
    opacity: 1;
  }

  &.connector-hover {
    opacity: 1;
    transition: opacity 0s;
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
