<script>
import { mapState, mapGetters, mapMutations } from 'vuex';
import { throttle } from 'lodash';

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
        // TODO: NXT-803 why do we need the scroll element in the store?
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
        onMouseDown(e) {
            /*  To avoid for [mousedown on node], [moving mouse], [mouseup on kanvas] to deselect nodes,
             *  we track whether a click has been started on the empty Kanvas
             */
            this.clickStartedOnEmptyKanvas = e.target === this.$refs.svg;
        },
        onSelfMouseUp(e) {
            // deselect all nodes
            if (this.clickStartedOnEmptyKanvas) {
                this.clickStartedOnEmptyKanvas = null;
                this.$emit('empty-click');
            }
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
            const updateCanvas = throttle((width, height) => {
                this.$store.commit('canvas/setContainerSize', { width, height });
            }, 100);
            // NXT 803: this ResizeObserver can be stuck in a negative update loop:
            // (Scrollbars needed -> svg gets inner container size, Scrollbar not needed -> svg gets outer container size)
            // Setting the svg to exactly the size of the container leads to scrollbar for unknown reasons.
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
  >
    <svg
      ref="svg"
      :width="canvasSize.width"
      :height="canvasSize.height"
      :viewBox="viewBoxString"
      @mousedown.left="onMouseDown"
      @mouseup.self.left="onSelfMouseUp"
    >
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
  /* TODO: NXT-803 still needed? */
  position: relative; /* needed for z-index to have effect */
  display: block;
}

.panning {
  cursor: move;

  & svg,
  & svg >>> * {
    pointer-events: none !important;
  }
}
</style>
