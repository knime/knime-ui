<script>
import { mapState, mapGetters, mapMutations, mapActions } from 'vuex';
import Node from '~/components/Node';
import MoveableNodeContainer from '~/components/MoveableNodeContainer';
import Connector from '~/components/Connector';
import WorkflowAnnotation from '~/components/WorkflowAnnotation';
import MetaNodePortBars from '~/components/MetaNodePortBars';
import KanvasFilters from '~/components/KanvasFilters';
import StreamedIcon from '~/components/../webapps-common/ui/assets/img/icons/nodes-connect.svg?inline';
import ConnectorLabel from '~/components/ConnectorLabel';
import ContextMenu from '~/components/ContextMenu';
import { throttle } from 'lodash';
import { dropNode } from '~/mixins';

const PANNING_THROTTLE = 50; // 50ms between consecutive mouse move events

export default {
    components: {
        Node,
        Connector,
        WorkflowAnnotation,
        MetaNodePortBars,
        KanvasFilters,
        StreamedIcon,
        ContextMenu,
        ConnectorLabel,
        MoveableNodeContainer
    },
    mixins: [dropNode],
    data() {
        return {
            /*
              Truthy if currently panning. Stores mouse origin
            */
            panning: null
        };
    },
    computed: {
        ...mapState('workflow', {
            workflow: 'activeWorkflow'
        }),
        ...mapGetters('workflow', [
            'isLinked',
            'isInsideLinked',
            'insideLinkedType',
            'isWritable',
            'isStreaming'
        ]),
        ...mapGetters('canvas', ['contentBounds', 'canvasSize', 'viewBox']),
        ...mapGetters('selection', ['selectedNodeIds']),
        ...mapState('canvas', ['containerSize', 'containerScroll', 'zoomFactor', 'suggestPanning']),
        viewBoxString() {
            let { viewBox } = this;
            return `${viewBox.left} ${viewBox.top} ` +
                    `${viewBox.width} ${viewBox.height}`;
        },
        // Sort nodes so that selected nodes are rendered in front
        sortedNodes() {
            let selected = [];
            let unselected = [];

            for (const nodeId of Object.keys(this.workflow.nodes)) {
                if (this.selectedNodeIds.includes(nodeId)) {
                    selected.push(this.workflow.nodes[nodeId]);
                } else {
                    unselected.push(this.workflow.nodes[nodeId]);
                }
            }
            return [...unselected, ...selected];
        }
    },
    watch: {
        workflow() {
            // Focus workflow on change for keyboard strokes to work
            this.$el.focus();
        }
    },
    mounted() {
        // Start Container Observers
        this.initContainerSize();
        this.setScrollContainerElement(this.$el);
        this.initResizeObserver();
        this.$el.focus();
    },
    beforeDestroy() {
        this.setScrollContainerElement(null);

        // Stop Resize Observer
        this.stopResizeObserver();
    },
    methods: {
        /*
          Selection
        */
        ...mapActions('selection', ['deselectAllObjects']),
        onMouseDown(e) {
            /*  To avoid for [mousedown on node], [moving mouse], [mouseup on kanvas] to deselect nodes,
             *  we track whether a click has been started on the empty Kanvas
             */
            this.clickStartedOnEmptyKanvas = e.target === this.$refs.svg;
        },
        onSelfMouseUp(e) {
            // deselect all nodes
            if (this.clickStartedOnEmptyKanvas) {
                this.deselectAllObjects();
                this.clickStartedOnEmptyKanvas = null;
            }
        },
        /*
            Zooming
        */
        ...mapMutations('canvas', ['resetZoom', 'setScrollContainerElement']),
        initContainerSize() {
            const { width, height } = this.$el.getBoundingClientRect();
            this.$store.commit('canvas/setContainerSize', { width, height });
        },
        initResizeObserver() {
            this.resizeObserver = new ResizeObserver(entries => {
                const containerEl = entries.find(({ target }) => target === this.$el);
                if (containerEl?.contentRect) {
                    const { width, height } = containerEl.contentRect;
                    this.$store.commit('canvas/setContainerSize', { width, height });
                }
            });
            this.resizeObserver.observe(this.$el);
        },
        stopResizeObserver() {
            if (this.resizeObserver) {
                this.resizeObserver.disconnect();
            }
        },
        onMouseWheel(e) {
            // delta is -1, 0 or 1 depending on scroll direction.
            let delta = Math.sign(-e.deltaY);

            // get mouse cursor position on canvas
            let scrollContainer = this.$el;
            let bcr = scrollContainer.getBoundingClientRect();
            let cursorX = e.clientX - bcr.x;
            let cursorY = e.clientY - bcr.y;

            this.$store.commit('canvas/zoomWithPointer', { delta, cursorX, cursorY });
        },
        /*
            Panning
        */
        beginPan(e) {
            this.panning = [e.screenX, e.screenY];
            this.$el.setPointerCapture(e.pointerId);
        },
        movePan: throttle(function (e) {
            /* eslint-disable no-invalid-this */
            if (this.panning) {
                const delta = [e.screenX - this.panning[0], e.screenY - this.panning[1]];
                this.panning = [e.screenX, e.screenY];
                this.$el.scrollLeft -= delta[0];
                this.$el.scrollTop -= delta[1];
            }
            /* eslint-disable no-invalid-this */
        }, PANNING_THROTTLE), // eslint-disable-line no-magic-numbers
        stopPan(e) {
            if (this.panning) {
                this.panning = null;
                this.$el.releasePointerCapture(e.pointerId);
                e.stopPropagation();
            }
        },
        onContextMenu(e) {
            // ignore click with ctrl and meta keys
            if (e.ctrlKey || e.metaKey) {
                return;
            }
            if (e.target === this.$refs.svg) {
                this.deselectAllObjects();
            }
            this.$refs.contextMenu.show(e);
        }
    }
};
</script>

<template>
  <div
    tabindex="0"
    :class="{ 'read-only': !isWritable, 'panning': panning || suggestPanning }"
    @wheel.meta.prevent="onMouseWheel"
    @wheel.ctrl.prevent="onMouseWheel"
    @pointerdown.middle="beginPan"
    @pointerup.middle="stopPan"
    @pointerdown.left.alt="beginPan"
    @pointerup.left="stopPan"
    @pointermove="movePan"
    @contextmenu.prevent="onContextMenu"
    @drop.stop="onDrop"
    @dragover.stop="onDragOver"
  >
    <ContextMenu
      ref="contextMenu"
    />
    <!-- Container for different notifications. At the moment there are streaming|linked notifications -->
    <div
      v-if="isLinked || isStreaming || isInsideLinked"
      :class="['type-notification', {onlyStreaming: isStreaming && !isLinked}]"
    >
      <span
        v-if="isLinked"
      >
        This is a linked {{ workflow.info.containerType }} and can therefore not be edited.
      </span>
      <span
        v-if="isInsideLinked"
      >
        This is a {{ workflow.info.containerType }} inside a linked {{ insideLinkedType }} and cannot be edited.
      </span>
      <span
        v-if="isStreaming"
        :class="['streaming-decorator', { isLinked }]"
      >
        <StreamedIcon class="streamingIcon" />
        <p>Streaming</p>
      </span>
    </div>

    <svg
      ref="svg"
      :width="canvasSize.width"
      :height="canvasSize.height"
      :viewBox="viewBoxString"
      @mousedown.left="onMouseDown"
      @mouseup.self.left="onSelfMouseUp"
    >

      <!-- Includes shadows for Nodes -->
      <KanvasFilters />

      <!-- Workflow Annotation Layer. Background -->
      <WorkflowAnnotation
        v-for="annotation of workflow.workflowAnnotations"
        :key="`annotation-${annotation.id}`"
        v-bind="annotation"
      />

      <!-- Node Selection Plane Layer -->
      <portal-target
        multiple
        tag="g"
        name="node-select"
      />

      <!-- Connectors Layer -->
      <Connector
        v-for="(connector, id) of workflow.connections"
        :key="`connector-${workflow.projectId}-${id}`"
        v-bind="connector"
      />

      <!-- Metanode Port Bars (Inside of Metanodes) -->
      <MetaNodePortBars
        v-if="workflow.info.containerType === 'metanode'"
      />

      <MoveableNodeContainer
        v-for="node of sortedNodes"
        :id="node.id"
        :key="`node-${workflow.projectId}-${node.id}`"
        :position="node.position"
        :kind="node.kind"
      >
        <Node
          :icon="$store.getters['workflow/getNodeIcon'](node.id)"
          :name="$store.getters['workflow/getNodeName'](node.id)"
          :type="$store.getters['workflow/getNodeType'](node.id)"
          v-bind="node"
        />
      </MoveableNodeContainer>

      <!-- Quick Actions Layer: Buttons for Hovered & Selected Nodes and their ids -->
      <portal-target
        multiple
        tag="g"
        name="node-actions"
      />

      <ConnectorLabel
        v-for="(connector, id) of workflow.connections"
        :key="`connector-label-${workflow.projectId}-${id}`"
        v-bind="connector"
      />

      <portal-target
        tag="g"
        name="drag-connector"
      />
    </svg>
  </div>
</template>

<style lang="postcss" scoped>
#kanvas {
  height: 100%;

  &:focus {
    outline: none;
  }
}

.debug-css {
  display: none;
  stroke: var(--knime-silver-sand);
  fill: none;
  pointer-events: none;
}

line.debug-css {
  stroke: var(--knime-dove-gray);
}

svg {
  color: var(--knime-masala);
  position: relative; /* needed for z-index to have effect */
  display: block;
}

.panning {
  cursor: move;

  & svg,
  & svg >>> * {
    pointer-events: none;
  }
}

.read-only {
  background-color: var(--knime-gray-ultra-light);
}

.type-notification {
  /* positioning */
  display: flex;
  margin: 0 10px;
  min-height: 40px;
  margin-bottom: -40px;
  left: 10px;
  top: 10px;
  position: sticky;
  z-index: 1;

  /* appearance */
  background-color: var(--notification-background-color);
  pointer-events: none;
  user-select: none;

  & span {
    font-size: 16px;
    align-self: center;
    text-align: center;
    width: 100%;
  }

  & p {
    font-size: 16px;
    align-self: center;
    text-align: center;
    margin-right: 10px;
  }
}

.streamingIcon {
  margin-right: 5px;
  width: 32px;
}

.streaming-decorator {
  pointer-events: none;
  display: flex;
  margin-right: 10px;
  height: 40px;
  justify-content: flex-end;
  flex-basis: 80px;
  flex-shrink: 0;

  & p {
    font-size: 16px;
    align-self: center;
    text-align: center;
  }

  &.isLinked p {
    margin-right: 10px;
  }
}

.onlyStreaming {
  background-color: unset;
  justify-content: flex-end;
  margin-right: 0;
}
</style>
