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
}

const props = defineProps<Props>();

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
</script>

<template>
  <rect
    :class="{
      selected: showSelectionPreview,
      bendpoint: true,
      'flow-variable': isFlowVariableConnection,
    }"
    :transform="`translate(
      ${position.x - BENDPOINT_SIZE / 2},
      ${position.y - BENDPOINT_SIZE / 2}
    )`"
    :width="BENDPOINT_SIZE"
    :height="BENDPOINT_SIZE"
  />
</template>

<style lang="postcss" scoped>
.bendpoint {
  --fill-color: var(--knime-stone-gray);

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
