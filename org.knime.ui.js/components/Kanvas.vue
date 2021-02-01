<script>
import { mapState, mapGetters, mapMutations } from 'vuex';
import Node from '~/components/Node';
import Connector from '~/components/Connector';
import WorkflowAnnotation from '~/components/WorkflowAnnotation';
import Tooltip from '~/components/Tooltip';
import MetaNodePortBars from '~/components/MetaNodePortBars';
import KanvasFilters from '~/components/KanvasFilters';

export default {
    components: {
        Node,
        Connector,
        WorkflowAnnotation,
        Tooltip,
        MetaNodePortBars,
        KanvasFilters
    },
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
            workflow: 'activeWorkflow',
            tooltip: 'tooltip'
        }),
        ...mapGetters('workflow', [
            'isLinked',
            'isWritable'
        ]),
        ...mapGetters('canvas', ['contentBounds', 'canvasSize', 'expandedViewBox']),
        ...mapState('canvas', ['containerSize', 'containerScroll', 'zoomFactor', 'suggestPanning']),
        viewBox() {
            let { expandedViewBox } = this;
            return  `${expandedViewBox.left} ${expandedViewBox.top} ` +
                    `${expandedViewBox.width} ${expandedViewBox.height}`;
        }

    },
    watch: {
        workflow() {
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
        ...mapMutations('workflow', ['deselectAllNodes']),
        onMouseDown(e) {
            /*  To avoid for [mousedown on node], [moving mouse], [mouseup on kanvas] to deselect nodes,
             *  we track whether a click has been started on the empty Kanvas
             */
            this.clickStartedOnEmptyKanvas = e.target === this.$refs.svg;
        },
        onSelfMouseUp(e) {
            // deselect all nodes
            if (this.clickStartedOnEmptyKanvas) {
                this.deselectAllNodes();
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
        movePan(e) {
            const speedFactor = 1;
            if (this.panning) {
                const delta = [e.screenX - this.panning[0], e.screenY - this.panning[1]];
                this.panning = [e.screenX, e.screenY];
                this.$el.scrollLeft -= delta[0] * speedFactor;
                this.$el.scrollTop -= delta[1] * speedFactor;
            }
        },
        stopPan(e) {
            if (this.panning) {
                this.panning = null;
                this.$el.releasePointerCapture(e.pointerId);
                e.stopPropagation();
            }
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
  >
    <div
      v-if="isLinked"
      class="link-notification"
    >
      <span>
        This is a linked {{ workflow.info.containerType }} and can therefore not be edited.
      </span>
    </div>

    <div
      class="tooltip-container"
    >
      <transition name="tooltip">
        <Tooltip
          v-if="tooltip"
          v-bind="tooltip"
        />
      </transition>
    </div>

    <svg
      ref="svg"
      :width="canvasSize.width"
      :height="canvasSize.height"
      :viewBox="viewBox"
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

      <!-- Non-Selected Nodes
        If node is not selected that portal has no effect.
        If node is selected, the portal will bring it to the front
       -->
      <portal
        v-for="(node, nodeId) in workflow.nodes"
        :key="`node-${workflow.projectId}-${nodeId}-portal`"
        :disabled="!node.selected"
        to="selected-nodes"
        slim
      >
        <Node
          :key="`node-${workflow.projectId}-${nodeId}`"
          :icon="$store.getters['workflow/nodeIcon']({ workflowId: workflow.projectId, nodeId })"
          :name="$store.getters['workflow/nodeName']({ workflowId: workflow.projectId, nodeId })"
          :type="$store.getters['workflow/nodeType']({ workflowId: workflow.projectId, nodeId })"
          v-bind="node"
        />
      </portal>

      <!-- Selected Nodes -->
      <portal-target
        multiple
        tag="g"
        name="selected-nodes"
      />

      <!-- Quick Actions Layer: Buttons for Hovered & Selected Nodes and their ids -->
      <portal-target
        multiple
        tag="g"
        name="node-actions"
      />

      <!-- Only Shown when flag INCLUDE_DEBUG_CSS is set  -->
      <rect
        class="debug-css"
        :x="contentBounds.left"
        :y="contentBounds.top"
        :width="contentBounds.width"
        :height="contentBounds.height"
      />
      <line
        y1="-10"
        y2="10"
        class="debug-css"
      />
      <line
        x1="-10"
        x2="10"
        class="debug-css"
      />
    </svg>
  </div>
</template>

<style lang="postcss" scoped>
#kanvas:focus {
  outline: initial;
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

.tooltip-container {
  height: 0;
  line-height: 0;

  & .tooltip-enter-active {
    /* delay entering of tooltip by 0.5 seconds */
    transition: opacity 150ms 0.5s ease;
  }

  & .tooltip-leave-active {
    transition: opacity 150ms ease;
  }

  & .tooltip-enter,
  & .tooltip-leave-to {
    opacity: 0;
  }
}

.read-only {
  background-color: var(--knime-gray-ultra-light);
}

.link-notification {
  /* positioning */
  display: flex;
  margin: 0 10px;
  height: 40px;
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
}
</style>
