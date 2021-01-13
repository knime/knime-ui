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
        ...mapGetters('canvas', ['zoomFactor', 'contentBounds', 'canvasSize', 'contentViewBox', 'containerOffset']),
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
            // delta is -1, 0 or 1 depending on scroll direction.
            let delta = Math.sign(-e.deltaY);

            // get mouse cursor position on canvas
            let scrollContainer = this.$el;
            let bcr = scrollContainer.getBoundingClientRect();
            let cursorX = e.clientX - bcr.left;
            let cursorY = e.clientY - bcr.top;

            // get scroll offset
            let scrollX = scrollContainer.scrollLeft;
            let scrollY = scrollContainer.scrollTop;
            
            let oldZoomFactor = this.zoomFactor;
            this.$store.commit('canvas/zoomWithPointer', { delta, cursorX, cursorY, scrollX, scrollY });
            if (oldZoomFactor === this.zoomFactor) { return; }
            
            // Zoom factor changed.
            // Scroll image such that the mouse pointer targets the same point as before (if possible).
            this.$nextTick(() => {
                scrollContainer.scrollLeft = this.containerOffset.left;
                scrollContainer.scrollTop = this.containerOffset.top;
            });
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
    :class="{ 'read-only': !isWritable, 'panning': panning }"
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
  </div>
</template>

<style lang="postcss" scoped>
.panning {
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

  & span {
    font-size: 16px;
    align-self: center;
    text-align: center;
    width: 100%;
  }
}
</style>
