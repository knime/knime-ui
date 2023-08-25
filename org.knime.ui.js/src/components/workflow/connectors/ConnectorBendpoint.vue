<script setup lang="ts">
import { computed, ref, onBeforeUnmount } from "vue";

import type { XY } from "@/api/gateway-api/generated-api";
import { $bus } from "@/plugins/event-bus";

interface Props {
  position: XY;
  connectionId: string;
  index: number;
  isFlowVariableConnection: boolean;
  isSelected: boolean;
  isDragging: boolean;
  interactive?: boolean;
  virtual?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  interactive: true,
  virtual: false,
});

const bendpointSelectionPreview = ref<string | null>(null);
if (!props.virtual) {
  $bus.on(
    `bendpoint-selection-preview-${props.connectionId}__${props.index}`,
    ({ preview }) => {
      bendpointSelectionPreview.value = preview;
    },
  );

  onBeforeUnmount(() => {
    $bus.off(
      `bendpoint-selection-preview-${props.connectionId}__${props.index}`,
    );
  });
}

const bendpointSize = computed(() => (props.virtual ? 4 : 6));

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

const translateX = computed(() => props.position.x - bendpointSize.value / 2);
const translateY = computed(() => props.position.y - bendpointSize.value / 2);

const transform = computed(
  () => `translate(${translateX.value}, ${translateY.value})`,
);

const transformOrigin = computed(
  () => `${bendpointSize.value / 2}px ${bendpointSize.value / 2}px`,
);
</script>

<template>
  <g :transform="transform">
    <rect
      v-if="interactive"
      :width="bendpointSize"
      :height="bendpointSize"
      :class="['hover-area', { dragging: isDragging, virtual }]"
      data-hide-in-workflow-preview
    />
    <rect
      :class="[
        'bendpoint',
        {
          selected: showSelectionPreview,
          'flow-variable': isFlowVariableConnection,
          virtual,
        },
      ]"
      :width="bendpointSize"
      :height="bendpointSize"
    />
  </g>
</template>

<style lang="postcss" scoped>
.hover-area {
  fill: none;
  stroke-width: 8px;
  stroke: transparent;
  cursor: grab;

  &.dragging {
    cursor: grabbing;
  }

  &:not(.virtual):hover + rect {
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

  &.virtual {
    --fill-color: var(--knime-white);

    stroke: var(--knime-stone-gray);
  }

  &.flow-variable:not(.selected) {
    --fill-color: var(--knime-coral);
  }
}
</style>
