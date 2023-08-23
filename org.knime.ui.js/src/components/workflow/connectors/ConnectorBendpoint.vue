<script setup lang="ts">
import { computed, ref, onBeforeUnmount } from "vue";

import type { XY } from "@/api/gateway-api/generated-api";
import { $bus } from "@/plugins/event-bus";

const BENDPOINT_SIZE = 6;

interface Props {
  position: XY;
  connectionId: string;
  index: number;
  isFlowVariableConnection: boolean;
  isSelected: boolean;
  isDragging: boolean;
  interactive?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  interactive: true,
});

const bendpointSelectionPreview = ref<string | null>(null);

$bus.on(
  `bendpoint-selection-preview-${props.connectionId}__${props.index}`,
  ({ preview }) => {
    bendpointSelectionPreview.value = preview;
  },
);

onBeforeUnmount(() => {
  $bus.off(`bendpoint-selection-preview-${props.connectionId}__${props.index}`);
});

const showSelectionPreview = computed(() => {
  // no preview
  if (bendpointSelectionPreview.value === null) {
    return props.isSelected;
  }

  // preview can override selected state (think: deselect with shift)
  if (props.isSelected && bendpointSelectionPreview.value === "hide") {
    return false;
  }

  return bendpointSelectionPreview.value === "show" || props.isSelected;
});

const translateX = computed(() => props.position.x - BENDPOINT_SIZE / 2);
const translateY = computed(() => props.position.y - BENDPOINT_SIZE / 2);

const transform = computed(
  () => `translate(${translateX.value}, ${translateY.value})`,
);

const transformOrigin = computed(
  () => `${BENDPOINT_SIZE / 2}px ${BENDPOINT_SIZE / 2}px`,
);
</script>

<template>
  <g :transform="transform">
    <rect
      v-if="interactive"
      :width="BENDPOINT_SIZE"
      :height="BENDPOINT_SIZE"
      class="hover-area"
      data-hide-in-workflow-preview
    />
    <rect
      :class="{
        selected: showSelectionPreview,
        bendpoint: true,
        'flow-variable': isFlowVariableConnection,
      }"
      :width="BENDPOINT_SIZE"
      :height="BENDPOINT_SIZE"
    />
  </g>
</template>

<style lang="postcss" scoped>
.hover-area {
  fill: none;
  stroke-width: 8px;
  stroke: transparent;
  cursor: grab;

  &:hover + rect {
    stroke: var(--fill-color);
    transition: transform 0.17s cubic-bezier(0.8, 2, 1, 2.5);
    transform-origin: v-bind(transformOrigin);
    transform: scale(1.2);
  }
}

.bendpoint {
  --fill-color: var(--knime-stone-gray);

  pointer-events: none;
  fill: var(--fill-color);
  stroke: var(--knime-white);

  &.selected {
    --fill-color: var(--knime-cornflower);
  }

  &.flow-variable:not(.selected) {
    --fill-color: var(--knime-coral);
  }
}
</style>
