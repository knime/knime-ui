<script>
import { mapState, mapGetters } from 'vuex';
import Node from '~/components/Node';
import Connector from '~/components/Connector';
import WorkflowAnnotation from '~/components/WorkflowAnnotation';
import Tooltip from '~/components/Tooltip';
import MetaNodePortBars from '~/components/MetaNodePortBars';

let resizeObserver = null;

export default {
    components: {
        Node,
        Connector,
        WorkflowAnnotation,
        Tooltip,
        MetaNodePortBars
    },
    data() {
        return {
            dragging: null
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
        ...mapGetters('canvas', ['zoomFactor', 'contentBounds', 'canvasSize', 'contentViewBox']),
        ...mapState('canvas', ['containerSize'])
    },
    mounted() {
        this.initContainerSize();
        this.initResizeObserver();
    },
    beforeDestroy() {
        this.stopResizeObserver();
    },
    methods: {
        /*
            Zooming
        */
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
            // deltaY is -1, 0 or 1 depending on scroll direction.
            let deltaY = Math.sign(-e.deltaY);
            
            let oldZoomFactor = this.zoomFactor;
            this.$store.commit('canvas/increaseLevel', deltaY);
            if (oldZoomFactor === this.zoomFactor) { return; }
            
            // Zoom factor changed.
            // Scroll image such that the mouse pointer targets the same point as before (if possible).

            /**
             * The formula comes from the observation that for a point (xOrig, yOrig) on the canvas,
             *    zoomFactor * xOrig = scrollLeft + xScreen
             * so
             *    xOrig = (scrollLeft_1 + xScreen) / zoomFactor_1 = (scrollLeft_2 + xScreen) / zoomFactor_2
             * and solving for scrollLeft_2 yields
             *    scrollLeft_2 = zoomFactor_2 / zoomFactor_1 * (scrollLeft_1 + xScreen) - xScreen
             * Likewise for y.
            */
            let scrollContainer = this.$el;
            let bcr = scrollContainer.getBoundingClientRect();
            let xScreen = e.clientX - bcr.left;
            let yScreen = e.clientY - bcr.top;
            let oldScrollLeft = scrollContainer.scrollLeft;
            let oldScrollTop = scrollContainer.scrollTop;

            // If the user zooms in the scroll bars are adjusted by those values to move the point under the cursor
            // If zoomed out further then 'fitToScreen', there won't be scrollbars and those numbers will be negative.
            //  No adjustment will be done
            let newScrollLeft = this.zoomFactor / oldZoomFactor * (oldScrollLeft + xScreen) - xScreen;
            let newScrollTop = this.zoomFactor / oldZoomFactor * (oldScrollTop + yScreen) - yScreen;

            this.$nextTick(() => {
                scrollContainer.scrollLeft = newScrollLeft;
                scrollContainer.scrollTop = newScrollTop;
            }, 0);
        },
        /*
            Pan
        */
        onMiddleMouseDown(e) {
            this.dragging = [e.screenX, e.screenY];
            this.$el.setPointerCapture(e.pointerId);
        },
        onPointerMove(e) {
            const speedFactor = 1;
            if (this.dragging) {
                const delta = [e.screenX - this.dragging[0], e.screenY - this.dragging[1]];
                this.dragging = [e.screenX, e.screenY];
                this.$el.scrollLeft -= delta[0] * speedFactor;
                this.$el.scrollTop -= delta[1] * speedFactor;
            }
        },
        onMiddleMouseUp(e) {
            if (this.dragging) {
                this.dragging = null;
                this.$el.releasePointerCapture(e.pointerId);
                e.stopPropagation();
            }
        }
    }
};
</script>

<template>
  <div
    :class="{ 'read-only': !isWritable, 'dragging': dragging }"
    @wheel.meta.prevent="onMouseWheel"
    @wheel.ctrl.prevent="onMouseWheel"
    @pointerdown.left.alt.stop="onMiddleMouseDown"
    @pointerup.left="onMiddleMouseUp"
    @pointerdown.middle.stop="onMiddleMouseDown"
    @pointerup.middle.stop="onMiddleMouseUp"
    @pointermove="onPointerMove"
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
      :width="canvasSize.width"
      :height="canvasSize.height"
      :viewBox="contentViewBox"
    >
      <rect
        class="workflow-boundary"
        :x="contentBounds.x"
        :y="contentBounds.y"
        :width="contentBounds.width"
        :height="contentBounds.height"
      />
      <WorkflowAnnotation
        v-for="annotation of workflow.workflowAnnotations"
        :key="`annotation-${annotation.id}`"
        v-bind="annotation"
      />
      <Connector
        v-for="(connector, id) of workflow.connections"
        :key="`connector-${workflow.projectId}-${id}`"
        v-bind="connector"
      />
      <MetaNodePortBars
        v-if="workflow.info.containerType === 'metanode'"
      />
      <Node
        v-for="(node, nodeId) in workflow.nodes"
        :key="`node-${workflow.projectId}-${nodeId}`"
        :icon="$store.getters['workflow/nodeIcon']({ workflowId: workflow.projectId, nodeId })"
        :name="$store.getters['workflow/nodeName']({ workflowId: workflow.projectId, nodeId })"
        :type="$store.getters['workflow/nodeType']({ workflowId: workflow.projectId, nodeId })"
        v-bind="node"
      />
      <portal-target
        multiple
        tag="g"
        name="node-select"
      />
    </svg>
    <!-- </ZoomContainer> -->
  </div>
</template>

<style lang="postcss" scoped>
.dragging {
  cursor: move;
}

svg {
  color: var(--knime-masala);
  position: relative; /* needed for z-index to have effect */
  display: block;

  & .workflow-boundary {
    stroke: var(--knime-silver-sand);
    fill: none;
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
  & .tooltip-leave-to /* .fade-leave-active below version 2.1.8 */ {
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

  & span {
    font-size: 16px;
    align-self: center;
    text-align: center;
    width: 100%;
  }
}
</style>
