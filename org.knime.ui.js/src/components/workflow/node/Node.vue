<script>
/* eslint-disable max-lines */
// TODO: NXT-1069 split up this file

import { mapActions, mapState, mapGetters } from 'vuex';

import NodePorts from '@/components/workflow/ports/NodePorts.vue';
import ConnectorSnappingProvider from '@/components/workflow/connectors/ConnectorSnappingProvider.vue';

import NodeTorso from './torso/NodeTorso.vue';
import NodeDecorators from './decorators/NodeDecorators.vue';
import NodeName from './name/NodeName.vue';
import NodeLabel from './label/NodeLabel.vue';

import NodeActionBar from './NodeActionBar.vue';
import NodeState from './NodeState.vue';
import NodeSelectionPlane from './NodeSelectionPlane.vue';
import NodeHoverSizeProvider from './NodeHoverSizeProvider.vue';

/**
 * A workflow node, including title, ports, node state indicator (traffic lights), selection frame and node annotation.
 * Must be embedded in an `<svg>` element.
 * Requires the `portal-vue` module.
 * */
export default {
    components: {
        NodeActionBar,
        NodeTorso,
        NodeState,
        NodeName,
        NodeLabel,
        NodePorts,
        NodeSelectionPlane,
        NodeDecorators,
        ConnectorSnappingProvider,
        NodeHoverSizeProvider
    },
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
        },

        /** Passed through to NodePorts */
        portGroups: {
            type: Object,
            default: null
        }
    },
    data() {
        return {
            isHovering: false,
            selectionPreview: null,
            nameDimensions: {
                width: 0,
                height: 20
            },
            portPositions: { in: [], out: [] }
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
        isContainerNode() {
            return ['metanode', 'component'].includes(this.kind);
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
            this.isHovering = false;
        },

        onLeftDoubleClick(e) {
            // Ctrl key (Cmd key on mac) required to open component. Metanodes can be opened without keys
            if (this.kind === 'metanode' || (this.kind === 'component' && (e.ctrlKey || e.metaKey))) {
                this.switchWorkflow({
                    newWorkflow: { workflowId: this.id, projectId: this.projectId }
                });
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
        onContextMenu(event) {
            if (this.isDragging) {
                return;
            }

            if (event.ctrlKey || event.metaKey) {
                // user tries to open component or metanode
                event.stopPropagation();
                return;
            }

            if (event.shiftKey) {
                // Multi select
                this.selectNode(this.id);
            } else if (!this.isNodeSelected(this.id)) {
                // single select
                this.deselectAllObjects();
                this.selectNode(this.id);
            }

            this.$store.dispatch('application/toggleContextMenu', { event });
        },

        // public
        setSelectionPreview(preview) {
            this.selectionPreview = preview === 'clear' ? null : preview;
        }
    }
};
</script>

<template>
  <ConnectorSnappingProvider
    :id="id"
    :position="position"
    :port-groups="portGroups"
    :port-positions="portPositions"
  >
    <template
      #default="{
        connectionForbidden,
        isConnectionSource,
        targetPort,
        connectorHover,
        on: {
          onConnectorEnter,
          onConnectorLeave,
          onConnectorMove,
          onConnectorDrop
        }
      }"
    >
      <g :class="{ 'connection-forbidden': connectionForbidden && !isConnectionSource }">
        <!-- NodeActionBar portalled to the front-most layer -->
        <portal to="node-actions">
          <NodeActionBar
            v-if="!insideStreamingComponent && isHovering && !isDragging"
            ref="actionbar"
            v-bind="allNodeActions"
            :transform="`translate(${actionBarPosition.x}, ${actionBarPosition.y})`"
            :node-id="id"
            @mouseleave.native="onLeaveHoverArea"
          />
        </portal>

        <!-- Node Selection Plane. Portalled to the back -->
        <portal to="node-select">
          <NodeSelectionPlane
            v-show="showSelectionPlane"
            :position="position"
            :width="selectionWidth"
            :extra-height="nameDimensions.height"
            :kind="kind"
          />
        </portal>

        <!-- Label needs to be behind ports -->
        <NodeLabel
          :value="annotation ? annotation.text : ''"
          v-bind="annotation"
          :kind="kind"
          :node-id="id"
          :node-position="position"
          @contextmenu.prevent="onContextMenu"
        />

        <!-- Elements for which mouse hover triggers hover state -->
        <g
          class="hover-container"
          @pointerdown.right="onContextMenu"
          @connector-enter="onConnectorEnter"
          @connector-leave="onConnectorLeave"
          @connector-move="onConnectorMove($event, { inPorts, outPorts })"
          @connector-drop="onConnectorDrop"
          @mouseenter="isHovering = true"
          @mouseleave="onLeaveHoverArea"
        >
          <NodeHoverSizeProvider
            :is-hovering="isHovering"
            :node-name-dimensions="nameDimensions"
            :is-connector-hovering="connectorHover"
            :allowed-actions="allowedActions"
            :port-positions="portPositions"
          >
            <template #default="{ hoverSize }">
              <!-- Elements for which a click selects node -->
              <g
                class="mouse-clickable"
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
                  :class="['node-torso', { hover: isHovering }]"
                  :filter="isHovering && 'url(#node-torso-shadow)'"
                  @dblclick.left.native="onLeftDoubleClick"
                />

                <NodeDecorators v-bind="$props" />

                <NodeState
                  v-if="kind !== 'metanode'"
                  v-bind="state"
                  :class="['node-state', { hover: isHovering }]"
                  :loop-status="loopInfo.status"
                  :transform="`translate(0, ${$shapes.nodeSize + $shapes.nodeStatusMarginTop})`"
                />
              </g>

              <!-- Node Ports -->
              <NodePorts
                :node-id="id"
                :node-kind="kind"
                :in-ports="inPorts"
                :out-ports="outPorts"
                :target-port="targetPort"
                :is-editable="isEditable"
                :port-groups="portGroups"
                :hover="isHovering"
                :connector-hover="connectorHover"
                :is-single-selected="isSingleSelected"
                @update-port-positions="portPositions = $event"
              />

              <!-- Node name / title -->
              <NodeName
                :node-id="id"
                :node-position="position"
                :value="name"
                :editable="isEditable && isContainerNode"
                @click.native.left="onLeftMouseClick"
                @pointerdown.right="onContextMenu"
                @width-change="nameDimensions.width = $event"
                @height-change="nameDimensions.height = $event"
                @edit-start="isHovering = false"
                @connector-enter.native.stop="onConnectorEnter"
                @connector-leave.native.stop="onConnectorLeave"
              />
            </template>
          </NodeHoverSizeProvider>
        </g>
      </g>
    </template>
  </ConnectorSnappingProvider>
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
  filter: "url(#node-state-shadow)";
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
</style>
