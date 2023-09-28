<script setup lang="ts">
import { computed } from "vue";

import CircleStopIcon from "webapps-common/ui/assets/img/icons/circle-stop.svg";
import { annotationColorPresets } from "@/style/colors.mjs";

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
      class="circle"
      stroke-width="4"
    />
  </svg>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.none {
  fill: var(--floating-background-primary);
}

svg {
  outline: 5px solid var(--floating-background-primary);
  border-radius: 50%;

  @mixin svg-icon-size 18;
}

.circle {
  fill: v-bind("filled ? props.color : 'var(--floating-background-primary)'");
}
</style>
