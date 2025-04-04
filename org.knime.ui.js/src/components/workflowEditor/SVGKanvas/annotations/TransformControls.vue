<script setup lang="ts">
import { computed, toRefs } from "vue";
import { storeToRefs } from "pinia";

import type { Bounds } from "@/api/gateway-api/generated-api";
import { useMovingStore } from "@/store/workflow/moving";
import { DIRECTIONS } from "../../common/annotations/transform-control-utils";
import { useTransformControls } from "../../common/annotations/useTransformControls";

type Props = {
  isAnnotationSelected: boolean;
  initialValue?: Bounds;
  showTransformControls?: boolean;
  showSelection?: boolean;
  showFocus?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  initialValue: () => ({ x: 0, y: 0, height: 0, width: 0 }),
  showFocus: false,
  showSelection: false,
  showTransformControls: false,
});

const emit = defineEmits<{
  transformEnd: [{ bounds: Bounds }];
}>();

const { initialValue, showSelection } = toRefs(props);

const {
  transformedBounds,
  transformRectStrokeWidth,
  controlSize,
  getControlPosition,
  getCursorStyle,
  startTransform,
} = useTransformControls({
  initialValue,
  onTransformEnd: (bounds) => emit("transformEnd", { bounds }),
});

const { movePreviewDelta } = storeToRefs(useMovingStore());

const TRANSFORM_OFFSETS = Object.freeze({
  selectionOffset: 1,
  focusOffset: 4,
});

const calculateSelectionBounds = (transformedBounds: Bounds) => {
  const movingOffset = props.isAnnotationSelected
    ? movePreviewDelta.value
    : { x: 0, y: 0 };

  return {
    x: transformedBounds.x - TRANSFORM_OFFSETS.selectionOffset + movingOffset.x,
    y: transformedBounds.y - TRANSFORM_OFFSETS.selectionOffset + movingOffset.y,
    width: transformedBounds.width + TRANSFORM_OFFSETS.selectionOffset * 2,
    height: transformedBounds.height + TRANSFORM_OFFSETS.selectionOffset * 2,
  };
};

const calculateFocusBounds = (transformedBounds: Bounds) => {
  const movingOffset = props.isAnnotationSelected
    ? movePreviewDelta.value
    : { x: 0, y: 0 };

  return {
    x: transformedBounds.x - TRANSFORM_OFFSETS.focusOffset + movingOffset.x,
    y: transformedBounds.y - TRANSFORM_OFFSETS.focusOffset + movingOffset.y,
    width: transformedBounds.width + TRANSFORM_OFFSETS.focusOffset * 2,
    height: transformedBounds.height + TRANSFORM_OFFSETS.focusOffset * 2,
  };
};

const transformRectBounds = computed(() =>
  calculateSelectionBounds(transformedBounds.value),
);

const focusRectBounds = computed(() =>
  calculateFocusBounds(transformedBounds.value),
);
</script>

<template>
  <g class="transform">
    <slot :transformed-bounds="transformedBounds" />

    <Portal to="annotation-transform">
      <rect
        v-if="showFocus"
        :x="focusRectBounds.x"
        :y="focusRectBounds.y"
        :width="focusRectBounds.width"
        :height="focusRectBounds.height"
        class="transform-box"
        :stroke="$colors.kanvasNodeSelection.activeBorder"
        :stroke-width="transformRectStrokeWidth"
        :rx="$shapes.selectedItemBorderRadius"
        :stroke-dasharray="5"
      />

      <rect
        v-if="showSelection"
        :x="transformRectBounds.x"
        :y="transformRectBounds.y"
        :width="transformRectBounds.width"
        :height="transformRectBounds.height"
        class="transform-box"
        :stroke="$colors.kanvasNodeSelection.activeBorder"
        :stroke-width="transformRectStrokeWidth"
        :rx="$shapes.selectedItemBorderRadius"
      />

      <template v-if="showTransformControls">
        <rect
          v-for="direction in DIRECTIONS"
          :key="direction"
          :x="getControlPosition(transformRectBounds, direction).x"
          :y="getControlPosition(transformRectBounds, direction).y"
          :width="controlSize"
          :height="controlSize"
          class="transform-control"
          :class="`transform-control-${direction}`"
          :style="getCursorStyle(direction)"
          @click.stop
          @pointerdown.self.stop="
            startTransform({ pointerDownEvent: $event, direction })
          "
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
