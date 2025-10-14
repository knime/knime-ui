<script setup lang="ts">
import { computed } from "vue";

import { SkeletonItem } from "@knime/components";

import type { Bounds } from "@/api/gateway-api/generated-api";
import * as $colors from "@/style/colors";
import * as $shapes from "@/style/shapes";
import FloatingHTML from "../common/FloatingHTML.vue";

type Props = {
  bounds: Bounds;
};

const props = defineProps<Props>();

const position = computed(() => ({ x: props.bounds.x, y: props.bounds.y }));
const dimensions = computed(() => ({
  width: props.bounds.width,
  height: props.bounds.height,
}));
</script>

<template>
  <FloatingHTML
    :active="true"
    :canvas-position="position"
    :dimensions="dimensions"
  >
    <div class="skeleton-container">
      <!-- H5 heading -->
      <SkeletonItem width="60%" height="16px" />

      <!-- first line of body text -->
      <SkeletonItem width="90%" height="13px" />
    </div>
  </FloatingHTML>
</template>

<style lang="postcss" scoped>
.skeleton-container {
  --border-width: calc(v-bind("$shapes.annotationBorderWidth") * 1px);

  /* fill the FloatingHTML container */
  width: 100%;
  height: 100%;

  /* mimic normal annotation styles */
  padding: 10px;
  border: var(--border-width) solid v-bind("$colors.SilverSand");

  /* control skeleton spacing */
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
