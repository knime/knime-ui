<script setup lang="ts">
import { computed } from "vue";

import ArrowDownIcon from "@knime/styles/img/icons/arrow-down.svg";
import CircleInfoIcon from "@knime/styles/img/icons/circle-info.svg";

import { useStore } from "@/composables/useStore";

import WorkflowPortalLayers from "./WorkflowPortalLayers.vue";

const store = useStore();

const uiControls = computed(() => store.state.uiControls);

const bounds = computed(() => {
  const { containerSize } = store.state.canvas;
  const { height, width } = containerSize;

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
</script>

<template>
  <g>
    <rect
      :x="rectangleBounds.left"
      :y="rectangleBounds.top"
      :width="rectangleBounds.width"
      :height="rectangleBounds.height"
      :class="{ dashed: uiControls.canEditWorkflow }"
    />

    <Component
      :is="uiControls.canEditWorkflow ? ArrowDownIcon : CircleInfoIcon"
      height="64"
      width="64"
      x="-32"
      y="-99"
    />

    <template v-if="uiControls.canEditWorkflow">
      <text y="-9">Start building your workflow by dropping</text>
      <text y="27"> your data or nodes here.</text>
    </template>

    <template v-else>
      <text y="0">This workflow is empty.</text>
    </template>

    <!-- Define all Portals also for the empty workflow because some features rely on them -->
    <WorkflowPortalLayers v-if="uiControls.canEditWorkflow" />
  </g>
</template>

<style lang="postcss" scoped>
rect {
  fill: none;

  &.dashed {
    stroke-width: 3;
    stroke: var(--knime-gray-dark-semi);
    stroke-linecap: square;
    stroke-dasharray: 9 19;
  }
}

svg {
  stroke: var(--knime-masala);
}

text {
  dominant-baseline: middle;
  text-anchor: middle;
  fill: var(--knime-masala);
  font-family: "Roboto Condensed", sans-serif;
  font-weight: normal;
  font-size: 24px;
  user-select: none;
}
</style>
