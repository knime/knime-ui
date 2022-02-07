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
        ...mapGetters('canvas', ['canvasSize', 'viewBox', 'canvasPadding']),
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
        /*
            Zooming
        */
        ...mapMutations('canvas', ['setScrollContainerElement']),
        initContainerSize() {
            // const { width, height } = this.$el.getBoundingClientRect();
            const [width, height] = [this.$el.clientWidth, this.$el.clientHeight];
            this.$store.commit('canvas/setContainerSize', { width, height });
        },
        initResizeObserver() {
            // recalculating and setting the container size is throttled.
            const updateCanvas = debounce((width, height) => {
                // find origin in screen coordinates
                let { x, y } = this.$store.getters['canvas/fromWorkflowCoordinates']({ x: 0, y: 0 });
                
                // update content depending on new container size
                this.$store.commit('canvas/setContainerSize', { width, height });
                
                // find new origin in screen coordinates
                let { x: newX, y: newY } = this.$store.getters['canvas/fromWorkflowCoordinates']({ x: 0, y: 0 });
                
                // scroll by the difference to prevent content from moving
                let [deltaX, deltaY] = [newX - x, newY - y];
                this.$el.scrollLeft += deltaX;
                this.$el.scrollTop += deltaY;
            }, 100, { trailing: true });
            
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

            this.$store.dispatch('canvas/zoomAroundPointer', { delta, cursorX, cursorY });
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
      @pointerdown.self.stop="$emit('empty-pointerdown', $event)"
    >
      <g :transform="`translate(${canvasPadding.left}, ${canvasPadding.top})`">
        <slot />
      </g>
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
