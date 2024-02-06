<script>
/* eslint-disable max-lines */
// TODO: NXT-1069 split up this file

import { mapActions, mapState, mapGetters, mapMutations } from "vuex";

import NodePorts from "@/components/workflow/ports/NodePorts.vue";
import ConnectorSnappingProvider from "@/components/workflow/connectors/ConnectorSnappingProvider.vue";
import { getMetaOrCtrlKey } from "webapps-common/util/navigator";

import NodeTorso from "./torso/NodeTorso.vue";
import NodeDecorators from "./decorators/NodeDecorators.vue";
import NodeName from "./name/NodeName.vue";
import NodeLabel from "./label/NodeLabel.vue";

import NodeActionBar from "./NodeActionBar.vue";
import NodeState from "./NodeState.vue";
import NodeSelectionPlane from "./NodeSelectionPlane.vue";
import NodeHoverSizeProvider from "./NodeHoverSizeProvider.vue";

import { APP_ROUTES } from "@/router/appRoutes";
import { KnimeMIME } from "@/mixins/dropNode";

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
    NodeHoverSizeProvider,
  },
  provide() {
    return {
      // Provide position as anchorPoint for tooltips
      anchorPoint: this.position,
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
      validator: (kind) => ["node", "metanode", "component"].includes(kind),
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
      validator: (position) =>
        typeof position.x === "number" && typeof position.y === "number",
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
      validator: (url) => url.startsWith("data:image/"),
    },

    /**
     * TemplateLink object containing the link URL and updateStatus
     */
    link: {
      type: Object,
      default: null,
    },

    /**
     * Node Execution State
     */
    state: {
      type: Object,
      validator(state) {
        return (
          Reflect.has(state, "executionState") ||
          Object.keys(state).length === 0
        );
      },
      default: null,
    },

    /**
     *  Props passed through to NodeActionBar
     */
    allowedActions: {
      type: Object,
      default: () => ({}),
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
        return (
          !info ||
          Reflect.has(info, "streamable") ||
          info.jobManager ||
          info.icon
        );
      },
      default: null,
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
        allowedActions: {},
      }),
    },

    /** Passed through to NodePorts */
    portGroups: {
      type: Object,
      default: null,
    },

    isReexecutable: {
      type: Boolean,
      default: false,
    },

    isLocked: {
      type: Boolean,
      default: null,
    },
  },
  data() {
    return {
      isHovering: false,
      selectionPreview: null,
      nameDimensions: {
        width: 0,
        height: 20,
      },
      portPositions: { in: [], out: [] },
      isDraggedOver: false,
      dragTarget: null,
      latestTap: 0,
    };
  },
  computed: {
    ...mapState("application", {
      projectId: "activeProjectId",
      permissions: "permissions",
    }),
    ...mapState("workflow", ["isDragging"]),
    ...mapGetters("selection", ["isNodeSelected", "singleSelectedNode"]),
    ...mapGetters("workflow", ["isWritable"]),
    ...mapGetters("application", ["hasAnnotationModeEnabled"]),

    /**
     * Width of the node selection plane. It accounts not only for the node margins
     * but also for the width of the name as it changes
     * @return {boolean}
     */
    selectionWidth() {
      return (
        this.nameDimensions.width + this.$shapes.nodeNameHorizontalMargin * 2
      );
    },
    /**
     * Checks if a streamable execution info has been set. The boolean value of the streamable variable does not
     * matter, as the presence of the variable already indicates that the node is inside of a streaming component
     * @return {boolean} if true action bar will be hidden
     */
    insideStreamingComponent() {
      return typeof this.executionInfo?.streamable !== "undefined";
    },
    allNodeActions() {
      return {
        ...this.allowedActions,
        ...this.loopInfo.allowedActions,
      };
    },
    isSelected() {
      return this.isNodeSelected(this.id);
    },

    isSingleSelected() {
      return this.singleSelectedNode?.id === this.id;
    },

    showSelection() {
      // no preview, honor dragging state
      if (this.selectionPreview === null) {
        return this.isSelected && !this.isDragging;
      }

      // preview can override selected state (think: deselect with shift)
      if (this.isSelected && this.selectionPreview === "hide") {
        return false;
      }

      return this.selectionPreview === "show" || this.isSelected;
    },

    showFocus() {
      return this.$store.getters["selection/focusedObject"]?.id === this.id;
    },

    isExecuting() {
      return this.state?.executionState === "EXECUTING";
    },
    isEditable() {
      return this.isWritable && !this.link;
    },
    isContainerNode() {
      return ["metanode", "component"].includes(this.kind);
    },
    actionBarPosition() {
      return {
        x: this.position.x + this.$shapes.nodeSize / 2,
        y:
          this.position.y -
          this.$shapes.nodeSelectionPadding[0] -
          this.nameDimensions.height,
      };
    },
  },
  methods: {
    ...mapActions("workflow", [
      "openNodeConfiguration",
      "replaceNode",
      "resetDragState",
    ]),
    ...mapActions("selection", [
      "selectNode",
      "deselectAllObjects",
      "deselectNode",
    ]),
    ...mapMutations("workflow", ["setIsDragging"]),

    onLeaveHoverArea(e) {
      const actionBarElement = this.$refs.actionbar?.$el;
      if (actionBarElement?.contains(e.relatedTarget)) {
        // Used to test for elements that are logically contained inside this node
        // but aren't DOM-wise because they were teleported to another layer.
        // Currently only applies to ref 'actionbar'
        return;
      }

      // chrome has a bug where it emits mouseleave even if the mouse did not really leave
      // in our case we have two different sets of elements that are logically contained but not DOM-wise
      // which makes it even more problematic. This check will prevent any false positives on leave.
      // In theroy the test above for the relatedTarget is superseeded by this one we keep both because
      // we consider this to be a workaround.
      // the bug: https://bugs.chromium.org/p/chromium/issues/detail?id=798535
      const hoverContainer = this.$refs.hoverContainer?.$el;
      const elementFromPoint = document.elementFromPoint(e.clientX, e.clientY);
      if (
        hoverContainer?.contains(elementFromPoint) ||
        actionBarElement?.contains(elementFromPoint)
      ) {
        return;
      }

      // disable hover state if the mouse leaves the hover area of the node
      this.isHovering = false;
    },

    onLeftDoubleClick(e) {
      // Ctrl key (Cmd key on mac) required to open component. Metanodes can be opened without keys
      if (
        this.kind === "metanode" ||
        (this.kind === "component" && (e.ctrlKey || e.metaKey))
      ) {
        if (this.isLocked) {
          consola.trace(`${this.kind} cannot be opened because it's locked`);
        } else {
          this.$router.push({
            name: APP_ROUTES.WorkflowPage,
            params: { projectId: this.projectId, workflowId: this.id },
          });
        }
      } else if (
        this.allowedActions?.canOpenDialog &&
        this.permissions.canConfigureNodes
      ) {
        // open node dialog if one is present
        this.openNodeConfiguration(this.id);
      }
    },

    /*
     * Left-Click                      => Select only this node
     * Left-Click & Shift or Ctrl/Meta => Add/Remove this node to/from selection
     */
    onLeftMouseClick(event) {
      if (this.isDragging) {
        return;
      }

      const metaOrCtrlKey = getMetaOrCtrlKey();

      if (event.shiftKey || event[metaOrCtrlKey]) {
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
     * Right-Click                      => Select only this node and show context menu (done in Kanvas.vue)
     * Right-Click & Shift or Ctrl/Meta => Add/Remove this node to/from selection and show context menu (via Kanvas)
     *
     * We use the contextmenu event as click with button = 2 was not reliable.
     */
    onContextMenu(event) {
      if (this.isDragging) {
        return;
      }

      const metaOrCtrlKey = getMetaOrCtrlKey();

      if (event.shiftKey || event[metaOrCtrlKey]) {
        // Multi select
        this.selectNode(this.id);
      } else if (!this.isNodeSelected(this.id)) {
        // single select
        this.deselectAllObjects();
        this.selectNode(this.id);
      }

      this.$store.dispatch("application/toggleContextMenu", { event });
    },

    onTorsoDragEnter(dragEvent) {
      if (!this.isWritable) {
        return;
      }
      if ([...dragEvent.dataTransfer.types].includes(KnimeMIME)) {
        this.isDraggedOver = true;
        this.dragTarget = dragEvent.target;
      }
    },

    onTorsoDragLeave(dragEvent) {
      if (this.dragTarget === dragEvent.target) {
        this.isDraggedOver = false;
        this.dragTarget = null;
      }
    },

    onTorsoDragDrop(dragEvent) {
      if (!this.isWritable) {
        return;
      }
      const nodeFactory = JSON.parse(dragEvent.dataTransfer.getData(KnimeMIME));
      this.replaceNode({ targetNodeId: this.id, nodeFactory });
      this.isDraggedOver = false;
      this.dragTarget = null;
    },

    onNodeDragggingEnter(event) {
      if (event.detail.isNodeConnected) {
        return;
      }
      event.preventDefault();
      this.isDraggedOver = true;
    },

    onNodeDragggingLeave() {
      this.isDraggedOver = false;
    },

    async onNodeDragggingEnd(dragEvent) {
      // avoid calling replaceNode by accident on quickly succesive click events
      if (this.id !== dragEvent.detail.id) {
        await this.replaceNode({
          targetNodeId: this.id,
          replacementNodeId: dragEvent.detail.id,
        });
      }
      this.isDraggedOver = false;
      this.resetDragState();
    },

    // public
    setSelectionPreview(preview) {
      this.selectionPreview = preview === "clear" ? null : preview;
    },
  },
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
          onConnectorDrop,
        },
      }"
    >
      <g
        v-bind="$attrs"
        :class="{
          'connection-forbidden': connectionForbidden && !isConnectionSource,
        }"
      >
        <!-- NodeActionBar portalled to the front-most layer -->
        <Portal to="node-actions">
          <NodeActionBar
            v-if="!insideStreamingComponent && isHovering && !isDragging"
            ref="actionbar"
            v-bind="allNodeActions"
            :transform="`translate(${actionBarPosition.x}, ${actionBarPosition.y})`"
            :node-id="id"
            :is-node-selected="isSelected"
            :node-kind="kind"
            @mouseleave="onLeaveHoverArea"
          />
        </Portal>

        <!-- Node Selection Plane. Portalled to the back -->
        <Portal to="node-select">
          <NodeSelectionPlane
            v-show="(showSelection || showFocus) && !hasAnnotationModeEnabled"
            :show-selection="showSelection"
            :show-focus="showFocus"
            :position="position"
            :width="selectionWidth"
            :extra-height="nameDimensions.height"
            :kind="kind"
          />
        </Portal>

        <!-- Label needs to be behind ports -->
        <NodeLabel
          :value="annotation ? annotation.text.value : ''"
          :annotation="annotation"
          :editable="isWritable"
          :kind="kind"
          :node-id="id"
          :node-position="position"
          :number-of-ports="Math.max(inPorts.length, outPorts.length)"
          @contextmenu.prevent="onContextMenu"
        />

        <!-- Elements for which mouse hover triggers hover state -->
        <g
          ref="hoverContainer"
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
              <g class="mouse-clickable" @click.left="onLeftMouseClick">
                <!-- Hover Area, larger than the node torso -->
                <rect
                  :class="['hover-area', { 'is-dragging': isDragging }]"
                  :width="hoverSize.width"
                  :height="hoverSize.height"
                  :x="hoverSize.x"
                  :y="hoverSize.y"
                  data-hide-in-workflow-preview
                />
                <g
                  class="node-torso-wrapper"
                  :class="{
                    grabbable: isWritable,
                    'is-dragging': isDragging,
                  }"
                >
                  <!--
                    This rect is needed because otherwise when the user
                    hovers in between the elements inside the .node-torso-wrapper
                    it won't trigger a proper class change because it's a
                    <g> element and does not have a fill,
                    so it will get picked up by the hover-area <rect> instead
                  -->
                  <rect
                    :class="{
                      grabbable: isWritable,
                      'is-dragging': isDragging,
                    }"
                    :width="$shapes.nodeSize"
                    :height="
                      kind === 'metanode'
                        ? $shapes.nodeSize
                        : $shapes.nodeSize + 20
                    "
                    :x="0"
                    :y="0"
                    data-hide-in-workflow-preview
                    fill="transparent"
                  />
                  <NodeTorso
                    :type="type"
                    :kind="kind"
                    :icon="icon"
                    :is-dragged-over="isDraggedOver"
                    :execution-state="state && state.executionState"
                    :class="['node-torso', { hover: isHovering }]"
                    :filter="isHovering && 'url(#node-torso-shadow)'"
                    @dblclick.left="onLeftDoubleClick"
                    @dragenter="onTorsoDragEnter"
                    @dragleave="onTorsoDragLeave"
                    @drop.stop="onTorsoDragDrop"
                    @node-dragging-enter="onNodeDragggingEnter"
                    @node-dragging-leave.prevent="onNodeDragggingLeave"
                    @node-dragging-end.prevent="onNodeDragggingEnd"
                  />

                  <NodeDecorators v-bind="$props" />

                  <NodeState
                    v-if="kind !== 'metanode'"
                    v-bind="state"
                    :class="['node-state', { hover: isHovering }]"
                    :loop-status="loopInfo.status"
                    :transform="`translate(0, ${
                      $shapes.nodeSize + $shapes.nodeStatusMarginTop
                    })`"
                  />
                </g>
              </g>

              <!-- Node Ports -->
              <NodePorts
                :node-id="id"
                :node-kind="kind"
                :in-ports="inPorts"
                :out-ports="outPorts"
                :target-port="targetPort"
                :is-editable="isEditable && !isExecuting"
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
                @click.left="onLeftMouseClick"
                @pointerdown.right="onContextMenu"
                @width-change="nameDimensions.width = $event"
                @height-change="nameDimensions.height = $event"
                @edit-start="isHovering = false"
                @connector-enter.stop="onConnectorEnter"
                @connector-leave.stop="onConnectorLeave"
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

  &.is-dragging {
    pointer-events: none;
  }
}

.grabbable {
  cursor: grab;
}

.is-grabbing {
  cursor: grabbing;
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
