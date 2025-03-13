<script setup lang="ts">
import { computed } from "vue";

import type { ConnectorBendpointProps } from "../../types";

const props = withDefaults(defineProps<ConnectorBendpointProps>(), {
  interactive: true,
  virtual: false,
  isVisible: false,
});

// eslint-disable-next-line no-magic-numbers
const bendpointSize = computed(() => (props.virtual ? 4 : 6));

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
      :class="[
        'hover-area',
        { dragging: isDragging, virtual, visible: isVisible },
      ]"
      data-hide-in-workflow-preview
    />
    <rect
      :class="[
        'bendpoint',
        {
          selected: isSelected,
          'flow-variable': isFlowVariableConnection,
          virtual,
          visible: isVisible,
        },
      ]"
      :width="bendpointSize"
      :height="bendpointSize"
      data-hide-in-workflow-preview
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
  --fill-color: transparent;

  pointer-events: none;
  fill: var(--fill-color);

  &.visible {
    --fill-color: var(--knime-stone-gray);

    stroke: var(--knime-white);
  }

  &.selected {
    --fill-color: var(--knime-cornflower);
  }

  &.virtual {
    --fill-color: var(--knime-white);

    stroke: var(--knime-stone-gray);
  }

  &.flow-variable.visible:not(.selected) {
    --fill-color: var(--knime-coral);
  }
}
</style>
