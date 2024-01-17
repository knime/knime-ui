<script>
import { mapState, mapGetters, mapMutations, mapActions } from "vuex";
import { debounce } from "lodash-es";
import throttle from "raf-throttle";

import { getMetaOrCtrlKey, isMac } from "webapps-common/util/navigator";
import { isInputElement } from "@/util/isInputElement";
import { isDynamicViewFocused } from "@/components/dynamicViews";

export const RESIZE_DEBOUNCE = 100;

export default {
  emits: ["containerSizeChanged"],
  data() {
    return {
      // true if currently panning
      isPanning: false,
      // determines whether the move cursor will be used. It will also apply the 'panning'
      // class which prevents pointer events on the svg element
      useMoveCursor: false,

      isHoldingDownSpace: false,
      isHoldingDownMiddleClick: false,
      isHoldingDownRightClick: false,
    };
  },
  computed: {
    ...mapGetters("canvas", ["canvasSize", "viewBox", "contentBounds"]),
    ...mapGetters("application", ["hasPanModeEnabled"]),
    ...mapGetters("workflow", ["isWorkflowEmpty"]),
    ...mapState("canvas", ["zoomFactor", "interactionsEnabled"]),
    ...mapState("application", ["scrollToZoomEnabled"]),
    ...mapState("workflow", ["isDragging"]),
  },
  watch: {
    contentBounds(...args) {
      this.contentBoundsChanged(args);
    },
  },
  mounted() {
    // Start Container Observers
    this.initScrollContainerElement(this.$el);
    this.initResizeObserver();
    this.$el.focus();

    document.addEventListener("keypress", this.onPressSpace);
    document.addEventListener("keyup", this.onReleaseKey);
    document.addEventListener("keydown", this.onDownShiftOrControl);

    this.windowBlurListener = () => {
      // unset panning state
      this.useMoveCursor = false;
      this.isPanning = false;
      this.isHoldingDownSpace = false;

      // unset move-lock state
      this.setIsMoveLocked(false);
    };

    window.addEventListener("blur", this.windowBlurListener);
  },
  beforeUnmount() {
    // Stop Resize Observer
    this.stopResizeObserver();

    // Remove reference to $el
    this.clearScrollContainerElement();
    window.removeEventListener("blur", this.windowBlurListener);
    document.removeEventListener("keypress", this.onPressSpace);
    document.removeEventListener("keyup", this.onReleaseKey);
    document.removeEventListener("keydown", this.onDownShiftOrControl);
  },
  methods: {
    ...mapActions("canvas", [
      "initScrollContainerElement",
      "updateContainerSize",
      "zoomAroundPointer",
      "contentBoundsChanged",
    ]),
    ...mapMutations("canvas", [
      "clearScrollContainerElement",
      "setIsMoveLocked",
    ]),

    initResizeObserver() {
      // updating the container size and recalculating the canvas is debounced.
      const updateContainerSize = debounce(() => {
        this.updateContainerSize();
        this.$nextTick(() => {
          this.$emit("containerSizeChanged");
        });
      }, RESIZE_DEBOUNCE);

      this.resizeObserver = new ResizeObserver((entries) => {
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
    zoom: throttle(function (e) {
      /* eslint-disable no-invalid-this */

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

    onMouseWheel(event) {
      if (!this.interactionsEnabled || this.isWorkflowEmpty) {
        return;
      }

      // If we don't want to use the wheel to zoom by default,
      // we still want to zoom on ctrl or meta key.
      // Note: The pinch-to-zoom gesture on Mac causes a wheel event with ctrlKey=True,
      //       so we need to check for it to obtain zoom on pinch-to-zoom.
      const shouldZoom =
        this.scrollToZoomEnabled || event.ctrlKey || (isMac() && event.metaKey);
      if (!shouldZoom) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      // we can only throttle the zoom function itself and not the event propagation,
      // otherwise we can get a mix of zooming and scrolling because some events
      // are propagated and some are not
      this.zoom(event);
    },

    /*
        Panning
        */
    onPressSpace(e) {
      if (isInputElement(e.target) || isDynamicViewFocused()) {
        return;
      }

      if (e.code !== "Space") {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      if (!this.isHoldingDownSpace) {
        this.useMoveCursor = true;
      }

      this.isHoldingDownSpace = true;
    },

    onReleaseKey(e) {
      if (e.code === "Space") {
        // unset panning state
        this.useMoveCursor = false;
        this.isPanning = false;
        this.isHoldingDownSpace = false;
      }

      if (e.code === "Escape") {
        // unset panning state
        this.useMoveCursor = false;
        this.isPanning = false;
        this.$store.dispatch("application/resetCanvasMode");
      }

      const metaOrCtrlKey = isMac() ? "Meta" : "Control";

      if (e.key === "Shift" || e.key === metaOrCtrlKey) {
        this.setIsMoveLocked(false);
      }
    },

    beginPan(e) {
      if (!this.interactionsEnabled || this.isWorkflowEmpty) {
        return;
      }
      const middleButton = 1;
      const rightButton = 2;

      this.isHoldingDownMiddleClick = e.button === middleButton;
      this.isHoldingDownRightClick = e.button === rightButton;

      // definite pan for these 3 interactions
      if (
        this.isHoldingDownMiddleClick ||
        this.isHoldingDownSpace ||
        this.hasPanModeEnabled
      ) {
        this.isPanning = true;
        this.useMoveCursor = true;
        this.panningOffset = [e.screenX, e.screenY];
        this.$el.setPointerCapture(e.pointerId);
      }

      // possibly will pan, but we need to wait further for the user to move
      if (this.isHoldingDownRightClick) {
        this.maybePanning = true;
        this.initialRightClickPosition = [e.screenX, e.screenY];
      }
    },
    movePan: throttle(function (e) {
      /* eslint-disable no-invalid-this */
      if (this.isPanning) {
        const delta = [
          e.screenX - this.panningOffset[0],
          e.screenY - this.panningOffset[1],
        ];
        this.panningOffset = [e.screenX, e.screenY];
        this.$el.scrollLeft -= delta[0];
        this.$el.scrollTop -= delta[1];
      }

      // user could potentially be wanting to pan via right-click
      if (this.maybePanning) {
        const MOVE_THRESHOLD = 15;
        const deltaX = Math.abs(e.screenX - this.initialRightClickPosition[0]);
        const deltaY = Math.abs(e.screenY - this.initialRightClickPosition[1]);

        // only start panning after we cross a certain threshold
        if (deltaX >= MOVE_THRESHOLD || deltaY >= MOVE_THRESHOLD) {
          this.isPanning = true;
          this.useMoveCursor = true;
          this.panningOffset = [e.screenX, e.screenY];
          this.$el.setPointerCapture(e.pointerId);

          // clear right-click state
          this.maybePanning = false;
          this.initialRightClickPosition = null;
        }
      }
      /* eslint-enable no-invalid-this */
    }),

    stopPan(event) {
      // user is not panning but did right-clicked
      if (!this.isPanning && this.isHoldingDownRightClick) {
        this.$store.dispatch("application/toggleContextMenu", {
          event,
          deselectAllObjects: true,
        });

        // unset right-click state since we're directly opening the menu instead of panning
        this.isHoldingDownRightClick = false;
        this.maybePanning = false;

        // stop event here
        event.stopPropagation();
        return;
      }

      if (this.isPanning) {
        this.isPanning = false;
        this.panningOffset = null;
        this.$el.releasePointerCapture(event.pointerId);
        event.stopPropagation();
      }

      // reset all states
      this.isHoldingDownRightClick = false;
      this.isHoldingDownMiddleClick = false;
      this.maybePanning = false;

      // move cursor should remain set if the user is still holding down the space key
      this.useMoveCursor = this.isHoldingDownSpace;
    },

    onDownShiftOrControl(e) {
      if (isInputElement(e.target)) {
        return;
      }

      const metaOrCtrlKey = getMetaOrCtrlKey();

      if ((e.shiftKey || e[metaOrCtrlKey]) && !this.isDragging) {
        this.setIsMoveLocked(true);
      }
    },

    startRectangleSelection(event) {
      const metaOrCtrlKey = getMetaOrCtrlKey();

      if (event.shiftKey || event[metaOrCtrlKey]) {
        this.$bus.emit("selection-pointerdown", event);
      }
    },
  },
};
</script>

<template>
  <div
    tabindex="0"
    :class="[
      'scroll-container',
      {
        panning: useMoveCursor || hasPanModeEnabled,
        empty: isWorkflowEmpty,
        disabled: !interactionsEnabled,
      },
    ]"
    @wheel="onMouseWheel"
    @pointerdown.middle="beginPan"
    @pointerdown.prevent.right="beginPan"
    @pointerdown.left="beginPan"
    @pointerup.middle="stopPan"
    @pointerup.left="stopPan"
    @pointerup.prevent.right="stopPan"
    @pointermove="movePan"
  >
    <svg
      ref="svg"
      :width="canvasSize.width"
      :height="canvasSize.height"
      :viewBox="viewBox.string"
      @pointerdown.left.exact.stop="$bus.emit('selection-pointerdown', $event)"
      @pointerdown.left.stop="startRectangleSelection"
      @pointerup.left.stop="$bus.emit('selection-pointerup', $event)"
      @pointermove="$bus.emit('selection-pointermove', $event)"
      @lostpointercapture="$bus.emit('selection-lostpointercapture', $event)"
    >
      <slot />
    </svg>
  </div>
</template>

<style lang="postcss" scoped>
svg {
  position: relative;

  /* needed for z-index to have effect */
  display: block;
}

.panning {
  cursor: move;

  & svg,
  & svg :deep(*) {
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
    overflow: hidden;

    /* disables scrolling */
  }

  &.disabled {
    pointer-events: none !important;

    & svg,
    & svg :deep(*) {
      pointer-events: none !important;
    }
  }
}
</style>
