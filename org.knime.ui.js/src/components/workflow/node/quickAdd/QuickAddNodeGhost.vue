<script setup lang="ts">
import { computed } from "vue";
import PlusIcon from "@knime/styles/img/icons/plus-small.svg";
import * as $shapes from "@/style/shapes";
import type { WorkflowDirection } from "@/api/custom-types";

/**
 * Node ghost with a plus ([ + ]) that shows up when user drags a port to some free space.
 * Only works for direction = out ports
 */

type Props = {
  position: [number, number];
  direction?: WorkflowDirection;
};

const props = withDefaults(defineProps<Props>(), {
  direction: "SUCCESSORS",
});

// eslint-disable-next-line no-magic-numbers
const iconSize = computed(() => $shapes.addNodeGhostSize * 0.9);

const translatePosition = computed(() => {
  const [x, y] = props.position;

  return props.direction === "SUCCESSORS"
    ? props.position
    : [x - ($shapes.addNodeGhostSize + $shapes.portSize), y];
});

const transformToCenter = computed(() => {
  return [$shapes.portSize / 2, -$shapes.addNodeGhostSize / 2];
});
</script>

<template>
  <g :transform="`translate(${translatePosition})`">
    <g :transform="`translate(${transformToCenter})`">
      <rect
        :width="$shapes.addNodeGhostSize"
        :height="$shapes.addNodeGhostSize"
        rx="1"
        ry="1"
      />
      <PlusIcon
        :width="iconSize"
        :height="iconSize"
        :x="$shapes.addNodeGhostSize / 2 - iconSize / 2"
        :y="$shapes.addNodeGhostSize / 2 - iconSize / 2"
      />
    </g>
  </g>
</template>

<style lang="postcss" scoped>
rect {
  fill: var(--knime-gray-ultra-light);
  stroke-width: 1;
  stroke-dasharray: 2;
  stroke: var(--knime-silver-sand);
}

svg {
  fill: white;
}
</style>
