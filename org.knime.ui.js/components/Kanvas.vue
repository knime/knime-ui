<script>
import { mapState, mapGetters, mapMutations } from 'vuex';
import { throttle, debounce } from 'lodash';

const PANNING_THROTTLE = 50; // 50ms between consecutive mouse move events

export default {
    data() {
        return {
            /*
              Truthy if currently panning. Stores mouse origin
            */
            panning: null
        };
    },
    computed: {
        ...mapGetters('workflow', ['workflowBounds']),
        ...mapGetters('canvas', ['canvasSize', 'viewBox']),
        ...mapState('canvas', ['suggestPanning']),
        viewBoxString() {
            let { viewBox } = this;
            return `${viewBox.left} ${viewBox.top} ${viewBox.width} ${viewBox.height}`;
        }
    },
    mounted() {
        // Start Container Observers
        this.initContainerSize();
        // TODO: NXT-802 do we really need the scroll element in the store?
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
        scrollTo(x, y, scrollToCenter = false, smooth = false) {
            let { x: absX, y: absY } = this.$store.getters['canvas/getAbsoluteCoordinates']({ x, y });
            let { width, height } = this.$store.state.canvas.containerSize;
            
            let [destX, destY] = scrollToCenter
                ? [width / 2, height / 2]
                : [0, 0];

            let [deltaX, deltaY] = [absX - destX, absY - destY];

            this.$el.scrollBy({
                left: deltaX,
                top: deltaY,
                behavior: smooth ? 'smooth' : 'instant'
            });
        },
        /*
            Zooming
        */
        ...mapMutations('canvas', ['setScrollContainerElement']),
        initContainerSize() {
            const { width, height } = this.$el.getBoundingClientRect();
            this.$store.commit('canvas/setContainerSize', { width, height });
        },
        initResizeObserver() {
            // recalculating and setting the container size is throttled.
            const updateCanvas = debounce((width, height) => {
                let { x, y } = this.$store.getters['canvas/getAbsoluteCoordinates']({ x: 0, y: 0 });
                this.$store.commit('canvas/setContainerSize', { width, height });
                let { x: newX, y: newY } = this.$store.getters['canvas/getAbsoluteCoordinates']({ x: 0, y: 0 });
                let [deltaX, deltaY] = [newX - x, newY - y];
                console.log(deltaX, deltaY);
                this.$el.scrollLeft += deltaX;
                this.$el.scrollTop += deltaY;
            }, 100, { leading: true, trailing: true });
            // This ResizeObserver can be stuck in an update loop:
            // (Scrollbars needed -> svg gets inner container size, Scrollbar not needed -> svg gets outer container size)
            // Setting the svg to exactly the size of the container leads to overflow and scrollbars for unknown reasons.
            this.resizeObserver = new ResizeObserver(entries => {
                const containerEl = entries.find(({ target }) => target === this.$el);
                if (containerEl?.contentRect) {
                    const { width, height } = containerEl.contentRect;
                    updateCanvas(width, height);
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
        }
    }
};
</script>

<template>
  <div
    tabindex="0"
    :class="['scroll-container', { 'panning': panning || suggestPanning }]"
    @wheel.meta.prevent="onMouseWheel"
    @wheel.ctrl.prevent="onMouseWheel"
    @pointerdown.middle="beginPan"
    @pointerup.middle="stopPan"
    @pointerdown.left.alt="beginPan"
    @pointerup.left="stopPan"
    @pointermove="movePan"
    @scrollTo="scrollTo($event)"
  >
    <svg
      ref="svg"
      :width="canvasSize.width"
      :height="canvasSize.height"
      :viewBox="viewBoxString"
      @pointerdown.self.stop="$emit('empty-pointerdown', $event)"
    >
      <rect
        class="workflow-sheet"
        :x="workflowBounds.left - 20"
        :y="workflowBounds.top - 20"
        :width="workflowBounds.right - workflowBounds.left + 40"
        :height="workflowBounds.bottom - workflowBounds.top + 40"
        stroke-width="1"
      />
      <slot />
    </svg>
  </div>
</template>

<style lang="postcss" scoped>
.scroll-container {
  position: relative;
  overflow: scroll;
  height: 100%;
  width: 100%;

  &:focus {
    outline: none;
  }
}

svg {
  position: relative; /* needed for z-index to have effect */
  display: block;
  background-color: #f7f7f7;
}

.workflow-sheet {
  fill: #fdfeff;
  filter: drop-shadow(4px 4px 18px rgba(0,0,0, 0.4));
}

.panning {
  cursor: move;

  & svg,
  & svg >>> * {
    pointer-events: none !important;
  }
}
</style>
