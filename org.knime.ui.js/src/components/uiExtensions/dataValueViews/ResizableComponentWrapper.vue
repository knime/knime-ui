<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useWindowSize } from "@vueuse/core";

import type {
  BoundingBox,
  BoundingBoxDimension,
  BoundingBoxInset,
} from "./useDataValueView";

export type Props = {
  minSize: { height: number; width: number };
  maxSize?: { height?: number; width?: number };
  rectState: BoundingBox;
};

const props = defineProps<Props>();

const emit = defineEmits<{
  "custom-resize": [Partial<BoundingBox>];
}>();

const resizeDirections = ref<string[] | null>(null);
const pointerId = ref<number | null>(null);
const start = reactive({
  clientX: 0,
  clientY: 0,
  top: 0,
  left: 0,
  width: 0,
  height: 0,
});

const { width: windowWidth, height: windowHeight } = useWindowSize();

const maxSizes = computed(() => ({
  height: props.maxSize?.height || windowHeight.value,
  width: props.maxSize?.width || windowWidth.value,
}));

const INSET_DIMENSION_MAP = {
  top: "height",
  left: "width",
} as const;

const getInsetMax = (inset: BoundingBoxInset) => {
  const dimension = INSET_DIMENSION_MAP[inset];
  const dimensionMin = props.minSize[dimension];
  const dimensionStart = start[dimension];
  const insetStart = start[inset];
  return dimensionStart > dimensionMin
    ? insetStart + (dimensionStart - dimensionMin)
    : insetStart;
};

const getInsetMin = (inset: BoundingBoxInset) => {
  const dimension = INSET_DIMENSION_MAP[inset];
  const dimensionMax = maxSizes.value[dimension];
  const dimensionStart = start[dimension];
  const insetStart = start[inset];
  return dimensionStart < dimensionMax
    ? insetStart - (dimensionMax - dimensionStart)
    : insetStart;
};

const insetMinMax = computed(() => ({
  min: { top: getInsetMin("top"), left: getInsetMin("left") },
  max: { top: getInsetMax("top"), left: getInsetMax("left") },
}));

const clampDimensionValue = (
  newSize: number,
  dimension: BoundingBoxDimension,
) => {
  const minSize = props.minSize[dimension];
  if (newSize <= minSize) {
    return minSize;
  }
  const maxSize = maxSizes.value[dimension];
  return Math.min(newSize, maxSize);
};

const clampInsetValue = (delta: number, inset: BoundingBoxInset) => {
  const newPlacementValue = start[inset] + delta;

  const { min, max } = insetMinMax.value;
  const minPlacementValue = min[inset];
  if (newPlacementValue <= minPlacementValue) {
    return minPlacementValue;
  }

  const maxPlacementValue = max[inset];
  return Math.min(newPlacementValue, maxPlacementValue);
};

const onPointerMove = (event: PointerEvent) => {
  if (!resizeDirections.value || pointerId.value !== event.pointerId) {
    return;
  }
  event.preventDefault();

  const deltaX = event.clientX - start.clientX;
  const deltaY = event.clientY - start.clientY;

  const newRect: Partial<BoundingBox> = {};

  if (resizeDirections.value.includes("north")) {
    newRect.height = clampDimensionValue(start.height - deltaY, "height");
    newRect.top = clampInsetValue(deltaY, "top");
  } else if (resizeDirections.value.includes("south")) {
    newRect.height = clampDimensionValue(start.height + deltaY, "height");
  }

  if (resizeDirections.value.includes("east")) {
    newRect.width = clampDimensionValue(start.width + deltaX, "width");
  } else if (resizeDirections.value.includes("west")) {
    newRect.width = clampDimensionValue(start.width - deltaX, "width");
    newRect.left = clampInsetValue(deltaX, "left");
  }

  emit("custom-resize", newRect);
};

const onPointerUp = (event: PointerEvent) => {
  if (pointerId.value !== event.pointerId) {
    return;
  }
  event.preventDefault();
  pointerId.value = null;
  resizeDirections.value = null;
};

const onPointerDown = (event: PointerEvent) => {
  event.preventDefault();
  const target = event.target as HTMLDivElement;
  target.setPointerCapture(event.pointerId);
  pointerId.value = event.pointerId;
  resizeDirections.value = Array.from(target.classList);
  start.clientX = event.clientX;
  start.clientY = event.clientY;
  Object.entries(props.rectState).forEach(([key, value]) => {
    start[key] = value;
  });
};

const hasHorizMinSize = computed(
  () => props.rectState.width <= props.minSize.width,
);
const hasHorizMaxSize = computed(
  () => props.rectState.width >= maxSizes.value.width,
);
const hasVertMinSize = computed(
  () => props.rectState.height <= props.minSize.height,
);
const hasVertMaxSize = computed(
  () => props.rectState.height >= maxSizes.value.height,
);
const hasHorizAndVertMinSize = computed(
  () => hasHorizMinSize.value && hasVertMinSize.value,
);
const hasHorizAndVertMaxSize = computed(
  () => hasHorizMaxSize.value && hasVertMaxSize.value,
);

const horizontalSizeClasses = computed(
  () =>
    `${hasHorizMinSize.value ? "has-min-size" : ""}${
      hasHorizMaxSize.value ? "has-max-size" : ""
    }`,
);

const verticalSizeClasses = computed(
  () =>
    `${hasVertMinSize.value ? "has-min-size" : ""}${
      hasVertMaxSize.value ? "has-max-size" : ""
    }`,
);

const horizontalAndVerticalSizeClasses = computed(
  () =>
    `${hasHorizAndVertMinSize.value ? "has-min-size" : ""}${
      hasHorizAndVertMaxSize.value ? "has-max-size" : ""
    }`,
);

const resizeBarsClasses = computed(() => [
  `vertical north ${verticalSizeClasses.value}`,
  `corner north east ${horizontalAndVerticalSizeClasses.value}`,
  `horizontal east ${horizontalSizeClasses.value}`,
  `corner south east ${horizontalAndVerticalSizeClasses.value}`,
  `vertical south ${verticalSizeClasses.value}`,
  `corner south west ${horizontalAndVerticalSizeClasses.value}`,
  `horizontal west ${horizontalSizeClasses.value}`,
  `corner north west ${horizontalAndVerticalSizeClasses.value}`,
]);
</script>

<template>
  <div class="resize-wrapper">
    <div
      v-for="(resizeBarClass, index) in resizeBarsClasses"
      :key="index"
      :class="['resize-bar', resizeBarClass]"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @lostpointercapture="onPointerUp"
    />
    <slot />
  </div>
</template>

<style>
.resize-wrapper {
  --resize-handle-corner-margin: 4px;
  --resize-handle-length: calc(100% - 2 * var(--resize-handle-corner-margin));
  --resize-handle-thickness: 6px;
  --resize-handle-inset-position: -4px;

  & .resize-bar {
    position: absolute;

    &.vertical {
      width: var(--resize-handle-length);
      height: var(--resize-handle-thickness);
      left: var(--resize-handle-corner-margin);
      cursor: ns-resize;

      &.north {
        top: var(--resize-handle-inset-position);

        &.has-min-size {
          cursor: n-resize;
        }

        &.has-max-size {
          cursor: s-resize;
        }
      }

      &.south {
        bottom: var(--resize-handle-inset-position);

        &.has-min-size {
          cursor: s-resize;
        }

        &.has-max-size {
          cursor: n-resize;
        }
      }
    }

    &.horizontal {
      width: var(--resize-handle-thickness);
      height: var(--resize-handle-length);
      top: var(--resize-handle-corner-margin);
      cursor: ew-resize;

      &.east {
        right: var(--resize-handle-inset-position);

        &.has-min-size {
          cursor: e-resize;
        }

        &.has-max-size {
          cursor: w-resize;
        }
      }

      &.west {
        left: var(--resize-handle-inset-position);

        &.has-min-size {
          cursor: w-resize;
        }

        &.has-max-size {
          cursor: e-resize;
        }
      }
    }

    &.corner {
      width: 8px;
      height: 8px;

      &.north {
        top: var(--resize-handle-inset-position);

        &.east {
          cursor: nesw-resize;

          &.has-min-size {
            cursor: ne-resize;
          }

          &.has-max-size {
            cursor: sw-resize;
          }
        }

        &.west {
          cursor: nwse-resize;

          &.has-min-size {
            cursor: nw-resize;
          }

          &.has-max-size {
            cursor: se-resize;
          }
        }
      }

      &.east {
        right: var(--resize-handle-inset-position);
      }

      &.south {
        bottom: var(--resize-handle-inset-position);

        &.east {
          cursor: nwse-resize;

          &.has-min-size {
            cursor: se-resize;
          }

          &.has-max-size {
            cursor: nw-resize;
          }
        }

        &.west {
          cursor: nesw-resize;

          &.has-min-size {
            cursor: sw-resize;
          }

          &.has-max-size {
            cursor: ne-resize;
          }
        }
      }

      &.west {
        left: var(--resize-handle-inset-position);
      }
    }
  }
}
</style>
