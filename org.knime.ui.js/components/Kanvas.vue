<script>
import { mapState, mapGetters, mapMutations, mapActions } from 'vuex';
import Node from '~/components/Node';
import Connector from '~/components/Connector';
import WorkflowAnnotation from '~/components/WorkflowAnnotation';
import Tooltip from '~/components/Tooltip';
import MetaNodePortBars from '~/components/MetaNodePortBars';
import KanvasFilters from '~/components/KanvasFilters';

let resizeObserver = null;
let keyDownEventListener = null;
let keyUpEventListener = null;

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
            /**
             *  To avoid for mousedown on node, moving mouse, mouseup on kanvas to deselect nodes
             *  We track whether a click has been started on the empty Kanvas
             */
            clickStartedOnEmptyKanvas: false,
            /*
              Truthy if currently panning. Stores mouse origin
            */
            panning: null,
            suggestPanning: false
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
        ...mapGetters('canvas', ['zoomFactor', 'contentBounds', 'canvasSize', 'contentViewBox', 'containerScroll']),
        ...mapState('canvas', ['containerSize'])
    },
    mounted() {
        // Start Key Listener
        keyDownEventListener = document.addEventListener('keydown', (e) => {
            let handled = true;
            if (e.ctrlKey || e.metaKey) {
                // Ctrl- and Meta- Combinations
                if (e.key === 'a') {
                    this.selectAllNodes();
                } else if (e.key === '0') {
                    this.resetZoom();
                } else if (e.key === '1') {
                    this.setZoomToFit();
                } else if (e.key === '+') {
                    this.zoomCentered(1);
                } else if (e.key === '-') {
                    this.zoomCentered(-1);
                } else {
                    handled = false;
                }
            } else if (e.key === 'Alt') {
                this.suggestPanning = true;
            } else {
                handled = false;
            }
            
            if (handled) {
                e.stopPropagation();
                e.preventDefault();
            }
        });
        keyUpEventListener = document.addEventListener('keyup', (e) => {
            if (e.key === 'Alt') {
                this.suggestPanning = false;
            }
        });

        // Start Container Observers
        this.initContainerSize();
        this.initResizeObserver();
        this.$watch('containerScroll', (newVal) => {
            this.$el.scrollLeft = newVal.left;
            this.$el.scrollTop = newVal.top;
        }, { deep: true });
    },
    beforeDestroy() {
        // Stop Key listener
        document.removeEventListener('keydown', keyDownEventListener);
        document.removeEventListener('keyup', keyUpEventListener);
        
        // Stop Resize Observer
        this.stopResizeObserver();
    },
    methods: {
        /*
          Selection
        */
        ...mapMutations('workflow', ['selectAllNodes', 'deselectAllNodes']),
        onMouseDown(e) {
            // if mousedown on empty kanvas set flag
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
        ...mapMutations('canvas', ['resetZoom']),
        ...mapActions('canvas', ['setZoomToFit', 'zoomCentered']),
        initContainerSize() {
            const { width, height } = this.$el.getBoundingClientRect();
            this.$store.commit('canvas/setContainerSize', { width, height });
        },
        initResizeObserver() {
            resizeObserver = new ResizeObserver(entries => {
                const containerEl = entries.find(({ target }) => target === this.$el);
                if (containerEl?.contentRect) {
                    const { width, height } = containerEl.contentRect;
                    this.$store.commit('canvas/setContainerSize', { width, height });
                }
            });
            resizeObserver.observe(this.$el);
        },
        stopResizeObserver() {
            if (resizeObserver) {
                resizeObserver.disconnect();
            }
        },
        onMouseWheel(e) {
            // delta is -1, 0 or 1 depending on scroll direction.
            let delta = Math.sign(-e.deltaY);

            // get mouse cursor position on canvas
            let scrollContainer = this.$el;
            let bcr = scrollContainer.getBoundingClientRect();
            let cursorX = e.clientX - bcr.left;
            let cursorY = e.clientY - bcr.top;

            // get current scroll offset
            let scrollX = scrollContainer.scrollLeft;
            let scrollY = scrollContainer.scrollTop;
            
            this.$store.commit('canvas/zoomWithPointer', { delta, cursorX, cursorY, scrollX, scrollY });
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
        },
        onScroll(e) {
            const { target: { scrollLeft, scrollTop } } = e;
            // could be throttled
            this.$store.commit('canvas/saveContainerScroll', { left: scrollLeft, top: scrollTop });
        }
    }
};
</script>

<template>
  <div
    :class="{ 'read-only': !isWritable, 'panning': panning || suggestPanning }"
    @wheel.meta.prevent="onMouseWheel"
    @wheel.ctrl.prevent="onMouseWheel"
    @pointerdown.middle="beginPan"
    @pointerup.middle="stopPan"
    @pointerdown.left.alt="beginPan"
    @pointerup.left="stopPan"
    @pointermove="movePan"
    @scroll="onScroll"
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
      :viewBox="contentViewBox"
      @mousedown.left="onMouseDown"
      @mouseup.self.left="onSelfMouseUp"
    >

      <!-- Includes shadows for Nodes -->
      <KanvasFilters />
      
      <!-- Only Shown when flag INCLUDE_DEBUG_CSS is set  -->
      <rect
        class="workflow-boundary"
        :x="contentBounds.x"
        :y="contentBounds.y"
        :width="contentBounds.width"
        :height="contentBounds.height"
      />
      
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
    </svg>
  </div>
</template>

<style lang="postcss" scoped>

svg {
  color: var(--knime-masala);
  position: relative; /* needed for z-index to have effect */
  display: block;

  & .workflow-boundary {
    stroke: var(--knime-silver-sand);
    fill: none;
    display: none;
  }
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
