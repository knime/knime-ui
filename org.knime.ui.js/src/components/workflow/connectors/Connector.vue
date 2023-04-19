<script lang="ts">
import { defineComponent } from 'vue';
import gsap from 'gsap';
import { mapState, mapGetters, mapActions } from 'vuex';

import { portBar, connectorPosition } from '@/mixins';
import { checkPortCompatibility } from '@/util/compatibleConnections';
import connectorPath from '@/util/connectorPath';

import { KnimeMIME } from '@/mixins/dropNode';

/**
 * A curved line, connecting one node's output with another node's input port.
 * Must be embedded in an `<svg>` element.
 * Uses the connectorPosition mixin to get the start and end position of the connector.
 */
export default defineComponent({
    mixins: [portBar, connectorPosition],
    inheritAttrs: false,
    props: {
        /**
         * Determines whether this connector is streamed at the moment
         */
        streaming: { type: Boolean, default: false },

        /**
         * Determines whether this connector is rendered in alternative color
         */
        flowVariableConnection: { type: Boolean, default: false },

        /**
         * Connector id
         */
        id: {
            type: String,
            required: true
        },
        allowedActions: {
            type: Object,
            required: true,
            validate(o) {
                return o.hasOwnProperty('canDelete');
            }
        },
        interactive: {
            type: Boolean,
            default: true
        }
    },
    data: () => ({
        suggestDelete: false,
        hover: false,
        isDraggedOver: false
    }),
    computed: {
        ...mapState('workflow', {
            workflow: 'activeWorkflow',
            movePreviewDelta: 'movePreviewDelta',
            isDragging: 'isDragging'
        }),
        ...mapGetters('workflow', {
            isWorkflowWritable: 'isWritable'
        }),
        ...mapGetters('selection', [
            'isConnectionSelected',
            'isNodeSelected',
            'singleSelectedNode',
            'selectedConnections'
        ]),
        ...mapGetters('canvas', ['screenToCanvasCoordinates']),
        ...mapState('application', ['availablePortTypes']),
        path() {
            let { start: [x1, y1], end: [x2, y2] } = this;
            // Update position of source or destination node is being moved
            if (this.isDragging) {
                if (this.isNodeSelected(this.sourceNode)) {
                    x1 += this.movePreviewDelta.x;
                    y1 += this.movePreviewDelta.y;
                }
                if (this.isNodeSelected(this.destNode)) {
                    x2 += this.movePreviewDelta.x;
                    y2 += this.movePreviewDelta.y;
                }
            }

            return connectorPath(x1, y1, x2, y2);
        },
        isHighlighted() {
            // if only one node and no connections are selected, highlight the connections from and to that node
            return (Boolean(this.singleSelectedNode) && this.selectedConnections.length === 0) &&
                (this.isNodeSelected(this.sourceNode) || this.isNodeSelected(this.destNode));
        }
    },
    watch: {
        /*
         * if suggestDelete changes to 'true' the connector will animate away from its target port
         * if suggestDelete changes back to 'false' the connector will move back
         */
        suggestDelete(newValue, oldValue) {
            const visiblePath = this.$refs.visiblePath as HTMLElement;
            if (newValue && !oldValue) {
                const shiftX = -12;
                const shiftY = -6;
                let { start: [x1, y1], end: [x2, y2] } = this;
                let newPath = connectorPath(x1, y1, x2 + shiftX, y2 + shiftY);

                gsap.to(visiblePath, {
                    attr: { d: newPath },
                    duration: 0.2,
                    ease: 'power2.out'
                });
            } else if (!newValue && oldValue) {
                gsap.to(visiblePath, {
                    attr: { d: this.path },
                    duration: 0.2,
                    ease: 'power2.out'
                });
            }
        }
    },
    methods: {
        ...mapActions('selection', ['selectConnection', 'deselectConnection', 'deselectAllObjects']),
        ...mapActions('application', ['toggleContextMenu']),

        onContextMenu(event: MouseEvent) {
            // right click should work same as left click
            this.onMouseClick(event);
            this.toggleContextMenu({ event });
        },
        onMouseClick(event: MouseEvent) {
            if (event.shiftKey) {
                // Multi select
                if (this.isConnectionSelected(this.id)) {
                    this.deselectConnection(this.id);
                } else {
                    this.selectConnection(this.id);
                }
            } else {
                // Single select
                this.deselectAllObjects();
                this.selectConnection(this.id);
            }
        },
        onIndicateReplacement({ detail: { state } }) {
            this.suggestDelete = state;
        },
        onConnectorDragEnter(dragEvent: DragEvent) {
            if ([...dragEvent.dataTransfer.types].includes(KnimeMIME)) {
                this.isDraggedOver = true;
            }
        },
        onConnectorDragLeave() {
            this.isDraggedOver = false;
        },
        onConnectorDrop(dragEvent: DragEvent) {
            const nodeFactory = JSON.parse(dragEvent.dataTransfer.getData(KnimeMIME));
            this.insertNode({
                clientX: dragEvent.clientX,
                clientY: dragEvent.clientY,
                nodeFactory,
                event: dragEvent
            });
        },
        onNodeDragggingEnter(event: CustomEvent) {
            const { isNodeConnected, inPorts, outPorts } = event.detail;

            const hasCompatibleSrcPort = this.sourceNodeObject &&
                inPorts.some(toPort => checkPortCompatibility(
                    { fromPort: this.sourceNodeObject.outPorts[this.sourcePort],
                        toPort,
                        availablePortTypes: this.availablePortTypes }
                ));
            const hasCompatibleDestPort = this.destNodeObject &&
                outPorts.some(fromPort => checkPortCompatibility(
                    { fromPort,
                        toPort: this.destNodeObject.inPorts[this.destPort],
                        availablePortTypes: this.availablePortTypes }
                ));
            if (!hasCompatibleSrcPort && !hasCompatibleDestPort) {
                return;
            }

            if (isNodeConnected) {
                return;
            }
            event.preventDefault();
            this.isDraggedOver = true;
        },
        onNodeDragggingEnd(dragEvent: CustomEvent) {
            this.insertNode({
                clientX: dragEvent.detail.clientX,
                clientY: dragEvent.detail.clientY,
                nodeId: dragEvent.detail.id,
                event: dragEvent
            });
        },
        insertNode({ clientX, clientY, event, nodeId = null, nodeFactory = null }) {
            const [x, y] = this.screenToCanvasCoordinates([
                clientX - this.$shapes.nodeSize / 2,
                clientY - this.$shapes.nodeSize / 2
            ]);
            if (this.allowedActions.canDelete) {
                this.$store.dispatch(
                    'workflow/insertNode',
                    { connectionId: this.id, position: { x, y }, nodeFactory, nodeId }
                );
            } else {
                window.alert('Cannot delete connection at this point. Insert node operation aborted.');
                event.detail.onError();
            }
            this.isDraggedOver = false;
        }
    }
});
</script>

<template>
  <g
    :data-connector-id="id"
    @indicate-replacement.stop="onIndicateReplacement"
  >
    <path
      v-if="interactive"
      :d="path"
      class="hover-area"
      @mouseenter="hover = true"
      @mouseleave="hover = false"
      @click.left="onMouseClick"
      @pointerdown.right="onContextMenu"
      @dragenter="onConnectorDragEnter"
      @dragleave="onConnectorDragLeave"
      @drop.stop="onConnectorDrop"
      @node-dragging-enter="onNodeDragggingEnter"
      @node-dragging-leave.prevent="onConnectorDragLeave"
      @node-dragging-end.prevent="onNodeDragggingEnd"
    />
    <path
      ref="visiblePath"
      :d="path"
      :class="{
        'flow-variable': flowVariableConnection,
        'read-only': !isWorkflowWritable,
        highlighted: isHighlighted,
        dashed: streaming,
        selected: isConnectionSelected(id) && !isDragging,
        'is-dragged-over': isDraggedOver
      }"
      fill="none"
    />
  </g>
</template>

<style lang="postcss" scoped>
@keyframes dash {
  from {
    stroke-dashoffset: 100;
  }

  to {
    stroke-dashoffset: 0;
  }
}

path:not(.hover-area) {
  pointer-events: none;
  stroke-width: v-bind("$shapes.connectorWidth");
  stroke: var(--knime-stone-gray);
  transition:
    stroke-width 0.1s ease-in,
    stroke 0.1s ease-in;

  &:not(.read-only) {
    cursor: grab;
  }

  &.selected {
    stroke-width: v-bind("$shapes.selectedConnectorWidth");
    stroke: var(--knime-cornflower);
  }

  &.highlighted {
    stroke-width: v-bind("$shapes.highlightedConnectorWidth");
    stroke: var(--knime-masala);
  }

  &.is-dragged-over {
    stroke-width: v-bind("$shapes.selectedConnectorWidth");
    stroke: var(--knime-meadow-dark);
  }

  &.dashed {
    stroke-dasharray: 5;
    stroke-dashoffset: 50;
    animation: dash 3s linear infinite;
  }

  &.flow-variable {
    stroke: var(--knime-coral);

    &.selected {
      stroke: var(--knime-cornflower);
    }
  }
}

.hover-area {
  stroke: transparent;
  stroke-width: 8px;
  fill: none;

  &:hover + path {
    stroke-width: v-bind("$shapes.selectedConnectorWidth");
  }
}
</style>
