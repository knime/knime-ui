<script lang="ts">
import { type PropType, defineComponent } from "vue";
import { mapGetters, mapState } from "vuex";

import type { Bounds } from "@/api/gateway-api/generated-api";

import {
  DIRECTIONS,
  type Directions,
  getGridAdjustedBounds,
  getTransformControlPosition,
  transformBounds,
} from "./transform-control-utils";

export const TRANSFORM_RECT_OFFSET = 1;
const FOCUS_PLANE_OFFSET_SIZE = 4;

export default defineComponent({
  props: {
    showTransformControls: {
      type: Boolean,
      default: false,
    },

    initialValue: {
      type: Object as PropType<Bounds>,
      default: () => ({ x: 0, y: 0, width: 0, height: 0 }),
    },

    showSelection: {
      type: Boolean,
      default: false,
    },

    showFocus: {
      type: Boolean,
      default: false,
    },
  },

  emits: {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    transformEnd: (_payload: { bounds: Bounds }) => true,
  },

  data() {
    return {
      directions: DIRECTIONS,
      innerValue: getGridAdjustedBounds(this.initialValue),
    };
  },

  computed: {
    ...mapGetters("canvas", ["screenToCanvasCoordinates"]),
    ...mapState("canvas", ["zoomFactor"]),
    ...mapState("workflow", ["movePreviewDelta"]),

    focusPlaneOffset() {
      const isSelected = this.showSelection;
      const deltaX = isSelected ? this.movePreviewDelta.x : 0;
      const deltaY = isSelected ? this.movePreviewDelta.y : 0;

      return {
        x: -FOCUS_PLANE_OFFSET_SIZE + deltaX,
        y: -FOCUS_PLANE_OFFSET_SIZE + deltaY,
        width: FOCUS_PLANE_OFFSET_SIZE * 2,
        height: FOCUS_PLANE_OFFSET_SIZE * 2,
      };
    },

    controlSize() {
      const CONTROL_SIZE = 6;
      const MAX_FACTOR = 1.4;

      return Math.max(
        CONTROL_SIZE / MAX_FACTOR,
        CONTROL_SIZE / this.zoomFactor,
      );
    },

    transformRectStrokeWidth() {
      return Math.max(
        this.$shapes.selectedAnnotationStrokeWidth / 2,
        this.$shapes.selectedAnnotationStrokeWidth / this.zoomFactor,
      );
    },

    valueWithOffset(): Bounds {
      return {
        width: this.innerValue.width + TRANSFORM_RECT_OFFSET * 2,
        height: this.innerValue.height + TRANSFORM_RECT_OFFSET * 2,
        x: this.innerValue.x - TRANSFORM_RECT_OFFSET,
        y: this.innerValue.y - TRANSFORM_RECT_OFFSET,
      };
    },
  },

  watch: {
    initialValue: {
      handler() {
        this.innerValue = getGridAdjustedBounds(this.initialValue);
      },
      immediate: true,
      deep: true,
    },
  },

  methods: {
    onStart({
      direction,
      event,
    }: {
      event: PointerEvent;
      direction: Directions;
    }) {
      const startX = this.innerValue.x;
      const startY = this.innerValue.y;
      const origWidth = this.innerValue.width;
      const origHeight = this.innerValue.height;

      (event.target as HTMLElement).setPointerCapture(event.pointerId);

      const transformHandler = (_event: MouseEvent) => {
        _event.stopPropagation();
        _event.preventDefault();
        const { clientX, clientY } = _event;
        const [moveX, moveY] = this.screenToCanvasCoordinates([
          clientX,
          clientY,
        ]);

        this.innerValue = transformBounds(this.innerValue, {
          startX,
          startY,
          origWidth,
          origHeight,
          moveX,
          moveY,
          direction,
        });
      };

      const mouseUpHandler = () => {
        window.removeEventListener("mousemove", transformHandler);
        window.removeEventListener("mouseup", mouseUpHandler);
      };

      window.addEventListener("mousemove", transformHandler);
      window.addEventListener("mouseup", mouseUpHandler);
    },

    onStop(event: PointerEvent) {
      (event.target as HTMLElement).releasePointerCapture(event.pointerId);
      this.$emit("transformEnd", { bounds: this.innerValue });
    },

    getControlPosition(direction: Directions) {
      return getTransformControlPosition({
        bounds: this.valueWithOffset,
        direction,
        controlSize: this.controlSize,
      });
    },

    getCursorStyle(direction: Directions) {
      return {
        cursor: `${direction}-resize`,
      };
    },
  },
});
</script>

<template>
  <g class="transform">
    <slot :transformed-bounds="innerValue" />

    <Portal to="annotation-transform">
      <rect
        v-if="showFocus"
        :x="valueWithOffset.x + focusPlaneOffset.x"
        :y="valueWithOffset.y + focusPlaneOffset.y"
        :width="valueWithOffset.width + focusPlaneOffset.width"
        :height="valueWithOffset.height + focusPlaneOffset.height"
        class="transform-box"
        :stroke="$colors.kanvasNodeSelection.activeBorder"
        :stroke-width="transformRectStrokeWidth"
        :rx="$shapes.selectedItemBorderRadius"
        :stroke-dasharray="5"
      />

      <rect
        v-if="showSelection"
        :width="valueWithOffset.width"
        :height="valueWithOffset.height"
        :x="valueWithOffset.x + movePreviewDelta.x"
        :y="valueWithOffset.y + movePreviewDelta.y"
        class="transform-box"
        :stroke="$colors.kanvasNodeSelection.activeBorder"
        :stroke-width="transformRectStrokeWidth"
        :rx="$shapes.selectedItemBorderRadius"
      />

      <template v-if="showTransformControls">
        <rect
          v-for="direction in directions"
          :key="direction"
          :x="getControlPosition(direction).x"
          :y="getControlPosition(direction).y"
          :width="controlSize"
          :height="controlSize"
          class="transform-control"
          :class="`transform-control-${direction}`"
          :style="getCursorStyle(direction)"
          @click.stop
          @pointerdown.self.stop="onStart({ event: $event, direction })"
          @pointerup.self.stop="onStop"
        />
      </template>
    </Portal>
  </g>
</template>

<style lang="postcss" scoped>
.transform-box {
  fill: transparent;
  z-index: v-bind("$zIndices.layerMinorElevation");

  /*
    Because the transform box is portaled to be on top of annotations we need to
    prevent pointer events on the transform-box rect so that
    interactions go to the actual annotation instead of this rect
    */
  pointer-events: none;
  user-select: none;
}

.transform-control {
  fill: var(--knime-cornflower);
  stroke: var(--knime-white);
  stroke-width: 1px;
}
</style>
