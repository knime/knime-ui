<script setup lang="ts">
import { computed } from "vue";

import * as $shapes from "@/style/shapes";
import NodeNameText from "../name/NodeNameText.vue";

type Props = {
  progress?: number;
  name?: string;
};

const props = defineProps<Props>();

const progressPercentile = computed(() => {
  if (!props.progress) {
    return "0%";
  }

  return `${Math.floor(props.progress * 100)}%`;
});

// eslint-disable-next-line no-magic-numbers
const borderLength = computed(() => 4 * $shapes.nodeSize);

const borderOffset = computed(() => {
  if (!props.progress) {
    return 0;
  }

  return borderLength.value * (1 - props.progress);
});
</script>

<template>
  <g>
    <NodeNameText :editable="false" :value="name" />

    <text :x="$shapes.nodeSize / 2" :y="$shapes.nodeSize / 2" class="progress">
      {{ progressPercentile }}</text
    >

    <rect
      :width="$shapes.nodeSize"
      :height="$shapes.nodeSize"
      :stroke="$colors.CornflowerSemi"
      fill="none"
      :stroke-width="$shapes.selectedNodeStrokeWidth"
      :rx="$shapes.nodeTorsoRadius"
    />

    <!-- Progress border -->
    <rect
      v-if="progress"
      class="progress-border"
      :width="$shapes.nodeSize"
      :height="$shapes.nodeSize"
      :stroke="$colors.kanvasNodeSelection.activeBorder"
      fill="none"
      :stroke-width="$shapes.selectedNodeStrokeWidth"
      :stroke-dasharray="borderLength"
      :stroke-dashoffset="borderOffset"
      :rx="$shapes.nodeTorsoRadius"
    />
  </g>
</template>

<style scoped>
.progress {
  font-size: 10px;
  dominant-baseline: middle;
  text-anchor: middle;
  fill: var(--knime-masala);
  font-family: "Roboto Condensed", sans-serif;
  font-weight: normal;
  user-select: none;
}
</style>
