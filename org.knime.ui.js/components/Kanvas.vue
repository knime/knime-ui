<script>
import { mapState, mapGetters, mapMutations, mapActions } from 'vuex';
import { debounce, throttle } from 'lodash';

export const RESIZE_DEBOUNCE = 100;

export default {
    data() {
        return {
            /* Truthy if currently panning. Stores mouse origin */
            isPanning: null
        };
    },
    computed: {
        ...mapGetters('canvas', ['canvasSize', 'viewBox', 'contentBounds']),
        ...mapState('canvas', ['suggestPanning', 'zoomFactor'])
    },
    watch: {
        contentBounds(...args) { this.contentBoundsChanged(args); }
    },
    mounted() {
        // Start Container Observers
        this.initScrollContainerElement(this.$el);
        this.initResizeObserver();
        this.$el.focus();
    },
    beforeDestroy() {
        // Stop Resize Observer
        this.stopResizeObserver();

        // Remove reference to $el
        this.clearScrollContainerElement();
    },
    methods: {
        ...mapActions('canvas', ['initScrollContainerElement', 'updateContainerSize', 'zoomAroundPointer',
            'contentBoundsChanged']),
        ...mapMutations('canvas', ['clearScrollContainerElement']),

        initResizeObserver() {
            // updating the container size and recalculating the canvas is debounced.
            const updateContainerSize = debounce(() => {
                this.updateContainerSize();
            }, RESIZE_DEBOUNCE);
            
            this.resizeObserver = new ResizeObserver(entries => {
                const containerEl = entries.find(({ target }) => target === this.$el);
                if (containerEl) {
                    updateContainerSize();
                }
            });

            this.stopResizeObserver = () => {
                if (this.resizeObserver) {
                    this.resizeObserver.disconnect();
                }
            };

            this.resizeObserver.observe(this.$el);
        },
        /*
            Zooming
        */
        onMouseWheel: throttle(function (e) {
            /* eslint-disable no-invalid-this */
            // delta is -1, 0 or 1 depending on scroll direction.
            let delta = Math.sign(-e.deltaY);

            // get mouse cursor position on canvas
            let scrollContainer = this.$el;
            let bcr = scrollContainer.getBoundingClientRect();
            let cursorX = e.clientX - bcr.x;
            let cursorY = e.clientY - bcr.y;

            requestAnimationFrame(() => {
                this.zoomAroundPointer({ delta, cursorX, cursorY });
            });
        }),
        /*
            Panning
        */
        beginPan(e) {
            this.isPanning = true;
            this.panningOffset = [e.screenX, e.screenY];
            this.$el.setPointerCapture(e.pointerId);
        },
        movePan: throttle(function (e) {
            /* eslint-disable no-invalid-this */
            if (this.isPanning) {
                const delta = [e.screenX - this.panningOffset[0], e.screenY - this.panningOffset[1]];
                this.panningOffset = [e.screenX, e.screenY];
                this.$el.scrollLeft -= delta[0];
                this.$el.scrollTop -= delta[1];
            }
            /* eslint-enable no-invalid-this */
        }),
        stopPan(e) {
            if (this.isPanning) {
                this.isPanning = false;
                this.panningOffset = null;
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
    :class="['scroll-container', { 'panning': isPanning || suggestPanning }]"
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
      :viewBox="viewBox.string"
      @pointerdown.left.shift.exact.stop="$emit('selection-pointerdown', $event)"
      @pointerdown.left.exact.stop="$emit('selection-pointerdown', $event)"
      @pointerup.left.stop="$emit('selection-pointerup', $event)"
      @pointermove="$emit('selection-pointermove', $event)"
      @lostpointercapture="$emit('selection-lostpointercapture', $event)"
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
  position: relative; /* needed for z-index to have effect */
  display: block;
  background-color: #f7f7f7;
}

.panning {
  cursor: move;

  & svg,
  & svg >>> * {
    pointer-events: none !important;
  }
}
</style>
