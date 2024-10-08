<script setup lang="ts">
import { computed } from "vue";

import CircleStopIcon from "@knime/styles/img/icons/circle-stop.svg";

import { annotationColorPresets } from "@/style/colors";

interface Props {
  color: string;
  filled?: boolean;
}

const props = withDefaults(defineProps<Props>(), { filled: false });

const isNone = computed(() => props.color === annotationColorPresets.None);
</script>

<template>
  <CircleStopIcon v-if="isNone" class="none" v-bind="$attrs" />

  <svg
    v-else
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 32 32"
    fill="none"
    stroke="#000"
    v-bind="$attrs"
  >
    <circle
      cx="16"
      cy="16"
      r="13"
      :stroke="color"
      :fill="filled ? color : 'white'"
      stroke-width="4"
    />
  </svg>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.none {
  fill: white;
}

svg {
  outline: 5px solid white;
  border-radius: 50%;

  @mixin svg-icon-size 18;
}
</style>
