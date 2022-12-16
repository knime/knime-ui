<script>
import { mapState, mapGetters, mapMutations, mapActions } from 'vuex';
import { debounce } from 'lodash';
import throttle from 'raf-throttle';

export const RESIZE_DEBOUNCE = 100;
const RIGHT_BUTTON_PAN_MODE_DELAY = 900; // ms
const blacklistTagNames = /^(input|textarea|select)$/i;

export default {
    data() {
        return {
            /* Truthy if currently panning. Stores mouse origin */
            isPanning: null,
            useMoveCursor: false,
            hasPanned: null,
            moveCursorTimeoutId: null
        };
    },
    computed: {
        ...mapGetters('canvas', ['canvasSize', 'viewBox', 'contentBounds']),
        ...mapState('canvas', ['suggestPanning', 'zoomFactor', 'interactionsEnabled', 'isEmpty'])
    },
    watch: {
        contentBounds(...args) {
            this.contentBoundsChanged(args);
        }
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
        ...mapMutations('canvas', ['clearScrollContainerElement', 'setSuggestPanning']),

        initResizeObserver() {
            // updating the container size and recalculating the canvas is debounced.
            const updateContainerSize = debounce(() => {
                this.updateContainerSize();
                this.$nextTick(() => {
                    this.$emit('container-size-changed');
                });
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
            if (!this.interactionsEnabled || this.isEmpty) {
                return;
            }

            // delta is -1, 0 or 1 depending on scroll direction.
            let delta = Math.sign(-e.deltaY);

            // get mouse cursor position on canvas
            let scrollContainer = this.$el;
            let bcr = scrollContainer.getBoundingClientRect();
            let cursorX = e.clientX - bcr.x;
            let cursorY = e.clientY - bcr.y;

            this.zoomAroundPointer({ delta, cursorX, cursorY });
            /* eslint-enable no-invalid-this */
        }),
        /*
            Panning
        */
        suggestPan(e) {
            if (blacklistTagNames.test(e.target.tagName)) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();
            this.setSuggestPanning(true);
        },
        beginPan(e) {
            if (!this.interactionsEnabled || this.isEmpty) {
                return;
            }
            const middleButton = 1;
            const rightButton = 2;

            if (this.suggestPanning || [middleButton, rightButton].includes(e.button)) {
                this.isPanning = true;
                // delay move cursor for right click
                if (e.button === rightButton) {
                    this.moveCursorTimeoutId = setTimeout(() => {
                        this.hasPanned = true;
                        this.useMoveCursor = true;
                    }, RIGHT_BUTTON_PAN_MODE_DELAY);
                } else {
                    this.useMoveCursor = true;
                }
                this.hasPanned = false;
                this.panningOffset = [e.screenX, e.screenY];
                this.$el.setPointerCapture(e.pointerId);
            }
        },
        movePan: throttle(function (e) {
            /* eslint-disable no-invalid-this */
            if (this.isPanning) {
                this.hasPanned = true;
                clearTimeout(this.moveCursorTimeoutId);
                this.useMoveCursor = true;
                const delta = [e.screenX - this.panningOffset[0], e.screenY - this.panningOffset[1]];
                this.panningOffset = [e.screenX, e.screenY];
                this.$el.scrollLeft -= delta[0];
                this.$el.scrollTop -= delta[1];
            }
            /* eslint-enable no-invalid-this */
        }),
        stopSuggestingPanning(e) {
            this.setSuggestPanning(false);
            this.isPanning = false;
        },
        stopPan(event) {
            if (this.isPanning) {
                if (!this.hasPanned) {
                    this.$store.dispatch('application/toggleContextMenu', {
                        event,
                        deselectAllObjects: true
                    });
                }
                clearTimeout(this.moveCursorTimeoutId);
                this.useMoveCursor = false;
                this.hasPanned = false;
                this.isPanning = false;
                this.panningOffset = null;
                this.$el.releasePointerCapture(event.pointerId);
                event.stopPropagation();
            }
        }
    }
};
</script>

<template>
  <div
    tabindex="0"
    :class="['scroll-container', {
      'panning': useMoveCursor || suggestPanning,
      'empty': isEmpty,
      'disabled': !interactionsEnabled,
    }]"
    @wheel.meta.prevent="onMouseWheel"
    @wheel.ctrl.prevent="onMouseWheel"
    @keypress.space.once="suggestPan"
    @keyup.space="stopSuggestingPanning"
    @pointerdown.middle="beginPan"
    @pointerdown.right="beginPan"
    @pointerdown.left="beginPan"
    @pointerup.middle="stopPan"
    @pointerup.left="stopPan"
    @pointerup.right="stopPan"
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
svg {
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

.scroll-container {
  position: relative;
  overflow: scroll;
  height: 100%;
  width: 100%;

  &:focus {
    outline: none;
  }

  &.empty {
    overflow: hidden; /* disables scrolling */
  }

  &.disabled {
    pointer-events: none !important;

    & svg,
    & svg >>> * {
      pointer-events: none !important;
    }
  }
}

</style>
