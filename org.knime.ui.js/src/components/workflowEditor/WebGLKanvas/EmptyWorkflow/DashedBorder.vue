<script setup lang="ts">
import { computed } from "vue";

import { useUIControlsStore } from "@/store/uiControls/uiControls";

const uiControls = useUIControlsStore();

const props = defineProps<{
  containerSize: {
    width: number;
    height: number;
  };
}>();

const bounds = computed(() => {
  const { height, width } = props.containerSize;

  // When showing this empty workflow, the origin (0,0) is exactly in the center of the canvas
  return {
    left: -width / 2,
    top: -height / 2,
    width,
    height,
  };
});

const rectangleBounds = computed(() => {
  const padding = 25;

  return {
    left: bounds.value.left + padding,
    top: bounds.value.top + padding,
    height: Math.max(bounds.value.height - 2 * padding, 0),
    width: Math.max(bounds.value.width - 2 * padding, 0),
  };
});

const viewBox = computed(() =>
  [
    -props.containerSize.width / 2,
    -props.containerSize.height / 2,
    props.containerSize.width,
    props.containerSize.height,
  ].join(" "),
);
</script>

<template>
  <svg
    class="dashed-border-wrapper"
    :width="containerSize.width"
    :height="containerSize.height"
    :viewBox="viewBox"
    aria-label="Empty workflow – start by adding nodes"
  >
    <g>
      <rect
        :x="rectangleBounds.left"
        :y="rectangleBounds.top"
        :width="rectangleBounds.width"
        :height="rectangleBounds.height"
        :class="{ dashed: uiControls.canEditWorkflow }"
      />

      <slot />
    </g>
  </svg>
</template>

<style lang="postcss" scoped>
.dashed-border-wrapper {
  stroke: var(--knime-masala);

  & rect {
    fill: none;

    &.dashed {
      stroke-width: 3;
      stroke: var(--knime-gray-dark-semi);
      stroke-linecap: square;
      stroke-dasharray: 9 19;
    }
  }
}
</style>
