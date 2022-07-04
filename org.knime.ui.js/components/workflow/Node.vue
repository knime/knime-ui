<script>
/* eslint-disable max-lines */
// TODO: NXT-1069 split up this file

import { mapActions, mapState, mapGetters } from 'vuex';

import NodePorts from './NodePorts';
import NodeDecorators from './NodeDecorators.vue';
import NodeState from '~/components/workflow/NodeState';
import NodeTorso from '~/components/workflow/NodeTorso';
import NodeAnnotation from '~/components/workflow/NodeAnnotation';
import NodeActionBar from '~/components/workflow/NodeActionBar';
import NodeSelectionPlane from '~/components/workflow/NodeSelectionPlane';
import NodeName from '~/components/workflow/NodeName';

import { snapConnector } from '~/mixins';

/**
 * A workflow node, including title, ports, node state indicator (traffic lights), selection frame and node annotation.
 * Must be embedded in an `<svg>` element.
 * Requires the `portal-vue` module.
 *
 * It needs to be the direct parent of <NodePorts> and is tightly coupled by direct access
 * */
export default {
    components: {
        NodeActionBar,
        NodeAnnotation,
        NodeTorso,
        NodeState,
        NodeName,
        NodePorts,
        NodeSelectionPlane,
        NodeDecorators
    },
    mixins: [snapConnector],
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
        ...mapGetters('selection', ['isNodeSelected', 'singleSelectedNode']),
        ...mapGetters('workflow', ['isWritable', 'isDragging']),
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
            return typeof this.executionInfo?.streamable !== 'undefined';
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

                let portBarBottom = this.$refs.nodePorts.portBarBottom;
                let margin = this.$shapes.nodeHoverPortBottomMargin;
                
                // if portBarBottom + margin is larger, then extend hover bounds
                hoverBounds.bottom = Math.max(portBarBottom + margin, hoverBounds.bottom);
            }

            return {
                y: hoverBounds.top,
                x: hoverBounds.left,
                width: hoverBounds.right - hoverBounds.left,
                height: hoverBounds.bottom - hoverBounds.top
            };
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
        isEditable() {
            return this.isWritable && !this.link;
        },
        isEditableContainerNode() {
            // only non-linked metanodes and components have editable names
            return this.isEditable && ['metanode', 'component'].includes(this.kind);
        },
        actionBarPosition() {
            return {
                x: this.position.x + this.$shapes.nodeSize / 2,
                y: this.position.y - this.$shapes.nodeSelectionPadding[0] - this.nameDimensions.height
            };
        },
        // provided as required by snapConnector mixin
        portPositions() {
            return this.$refs.nodePorts.portPositions;
        }
    },
    methods: {
        ...mapActions('workflow', ['openNodeConfiguration']),
        ...mapActions('application', ['switchWorkflow']),
        ...mapActions('selection', ['selectNode', 'deselectAllObjects', 'deselectNode']),
        
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

        onLeftDoubleClick(e) {
            // Ctrl key (Cmd key on mac) required to open component. Metanodes can be opened without keys
            if (this.kind === 'metanode' || (this.kind === 'component' && (e.ctrlKey || e.metaKey))) {
                this.switchWorkflow({ workflowId: this.id, projectId: this.projectId });
            } else if (this.allowedActions?.canOpenDialog) {
                // open node dialog if one is present
                this.openNodeConfiguration(this.id);
            }
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
        
        // public
        setSelectionPreview(preview) {
            this.selectionPreview = preview === 'clear' ? null : preview;
        },

        // implemented as required by snapConnector mixin
        isOutsideConnectorHoverRegion(x, y, targetPortDirection) {
            const upperBound = -20;

            if (y < upperBound) {
                return true;
            }
            if (targetPortDirection === 'in' && x > this.$shapes.nodeSize) {
                return true;
            }
            if (targetPortDirection === 'out' && x < 0) {
                return true;
            }

            return false;
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
        v-if="!insideStreamingComponent && hover && !isDragging"
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
          :class="['node-torso', { hover }]"
          :filter="hover && 'url(#node-torso-shadow)'"
          @dblclick.left.native="onLeftDoubleClick"
        />

        <NodeDecorators
          v-bind="$attrs"
          :link="link"
          :execution-info="executionInfo"
          :type="type"
          :kind="kind"
        />

        <NodeState
          v-if="kind !== 'metanode'"
          v-bind="state"
          :class="['node-state', { hover }]"
          :loop-status="loopInfo.status"
          :transform="`translate(0, ${$shapes.nodeSize + $shapes.nodeStatusMarginTop})`"
        />
      </g>

      <!-- Node Ports -->
      <NodePorts
        ref="nodePorts"
        :node-id="id"
        :is-metanode="kind === 'metanode'"
        :in-ports="inPorts"
        :out-ports="outPorts"
        :target-port="targetPort"
        :can-add-ports="isEditableContainerNode"
        :hover="hover"
        :connector-hover="connectorHover"
        :is-single-selected="isSingleSelected"
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

.hover-area {
  fill: none;
  pointer-events: fill;
}

.node-torso:hover,
.node-state:hover {
  filter: 'url(#node-state-shadow)';
}

.connection-forbidden .hover-container {
  filter: grayscale(40%) opacity(50%);
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
