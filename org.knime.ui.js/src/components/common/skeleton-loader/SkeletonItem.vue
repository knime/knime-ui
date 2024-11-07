<script setup lang="ts">
import { computed, toRefs } from "vue";

import * as $colors from "@/style/colors";

type Props = {
  width?: `${number}px` | `${number}%`;
  height?: `${number}px` | `${number}%`;
  color1?: string;
  color2?: string;
  type?: "generic" | "button" | "icon-button" | "rounded-sm" | "rounded-md";
  loading?: boolean;
  repeat?: number;
};

const props = withDefaults(defineProps<Props>(), {
  width: "100%",
  height: "100%",
  color1: $colors.GrayUltraLight,
  color2: $colors.Porcelain,
  type: "generic",
  repeat: 1,
  loading: true,
});

const { color1, color2, width, height } = toRefs(props);

const borderRadius = computed(() => {
  const valueMap: Partial<Record<Required<Props>["type"], string>> = {
    button: "9999px",
    "icon-button": "50%",
    "rounded-sm": "4px",
    "rounded-md": "8px",
  };

  return valueMap[props.type] ?? "initial";
});

const styles = computed(() => {
  return {
    background: `linear-gradient(to right, ${color1.value} 0%, ${color2.value} 25%, ${color1.value} 50%)`,
    backgroundSize: "200% 100%",
    // animation is defined as a global style in index.css
    animation: "2s knight-rider linear infinite",
    width: width.value,
    height: height.value,
    borderRadius: borderRadius.value,
    marginBottom: props.repeat > 1 ? "2px" : "",
  };
});
</script>

<template>
  <template v-if="loading">
    <div v-for="index in repeat" :key="index" v-bind="$attrs" :style="styles" />
  </template>
  <slot v-else v-bind="$attrs" />
</template>
