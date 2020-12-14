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
            containerSize: [0, 0],
            dragging: null
        };
    },
    computed: {
        ...mapState('workflow', {
            workflow: 'activeWorkflow',
            tooltip: 'tooltip'
        }),
        ...mapGetters('workflow', [
            'svgBounds',
            'isLinked',
            'isWritable'
        ]),
        ...mapGetters('zoom', {
            zoomFactor: 'factor'
        }),
        width() {
            return Math.max(this.containerSize[0], this.svgBounds.width * this.zoomFactor);
        },
        height() {
            return Math.max(this.containerSize[1], this.svgBounds.height * this.zoomFactor);
        },
        viewBox() {
            let { x, y, width, height } = this.svgBounds;
            return `${x} ${y} ${width} ${height}`;
        }
    },
    mounted() {
        this.initContainerSize();
        this.initResizeObserver();
    },
    beforeDestroy() {
        resizeObserver.disconnect();
    },
    methods: {
        initContainerSize() {
            const { width, height } = this.$el.getBoundingClientRect();
            this.containerSize = [width, height];
        },
        initResizeObserver() {
            resizeObserver = new ResizeObserver(entries => {
                const e = entries.find(({ target }) => target === this.$el);
                if (e?.contentRect) {
                    const { width, height } = e.contentRect;
                    this.containerSize = [width, height];
                }
            });
            resizeObserver.observe(this.$el);
        },
        onMouseWheel(e) {
            // returns -1, 0 or 1 depending on scroll direction
            const clamp = (delta) => {
                if (delta === 0) { return 0; }
                return delta < 0 ? -1 : 1;
            };

            let deltaY = clamp(-e.deltaY);
            
            let oldZoomFactor = this.zoomFactor;
            this.$store.commit('zoom/increaseLevel', deltaY);
            if (oldZoomFactor === this.zoomFactor) { return; }
            
            /**
             * Scroll image such that the mouse pointer targets the same point as before (if possible).
             * The formula comes from the observation that for a point (xOrig, yOrig) on the canvas,
             *
             *   zoomFactor * xOrig = scrollLeft + x
             *
             * so
             *
             *   xOrig = (scrollLeft_1 + x_1) / zoomFactor_1 = (scrollLeft_2 + x_2) / zoomFactor_2
             *
             * and solving for scrollLeft_2 yields
             *
             *   scrollLeft_2 = zoomFactor_2 / zoomFactor_1 * (scrollLeft_1 + x_1) - x_2
             *
             * Likewise for y.
            */
            let scroller = this.$el;
            let bcr = scroller.getBoundingClientRect();
            let x = e.clientX - bcr.left;
            let y = e.clientY - bcr.top;
            let oldScrollLeft = scroller.scrollLeft;
            let oldScrollTop = scroller.scrollTop;
            this.$nextTick(() => {
                scroller.scrollLeft = this.zoomFactor / oldZoomFactor * (oldScrollLeft + x) - x;
                scroller.scrollTop = this.zoomFactor / oldZoomFactor * (oldScrollTop + y) - y;
            }, 0);
        },
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
            this.dragging = null;
            this.$el.releasePointerCapture(e.pointerId);
        }
    }
};
</script>

<template>
  <div
    :class="{ 'read-only': !isWritable, 'dragging': dragging }"
    @wheel.meta.prevent="onMouseWheel"
    @wheel.ctrl.prevent="onMouseWheel"
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
    <!-- <ZoomContainer :scroller="$refs.scroller"> -->
    <svg
      :width="width"
      :height="height"
      :viewBox="viewBox"
    >
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
