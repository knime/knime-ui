<script setup lang="ts">
import { computed } from "vue";
import * as $colors from "@/style/colors.mjs";

type Props = {
  width?: `${number}px` | `${number}%`;
  height?: `${number}px` | `${number}%`;
  color1?: string;
  color2?: string;
  type?: "generic" | "button" | "icon-button";
};

const props = withDefaults(defineProps<Props>(), {
  width: "100%",
  height: "100%",
  color1: $colors.GrayUltraLight,
  color2: $colors.Porcelain,
  type: "generic",
});

const borderRadius = computed(() => {
  const valueMap: Partial<Record<Required<Props>["type"], string>> = {
    button: "9999px",
    "icon-button": "50%",
  };

  return valueMap[props.type] ?? "initial";
});

const styles = computed(() => {
  return {
    background: `linear-gradient(to right, ${props.color1} 0%, ${props.color2} 25%, ${props.color1} 50%)`,
    backgroundSize: "200% 100%",
    // animation is defined as a global style in index.css
    animation: "2s knight-rider linear infinite",
    width: props.width,
    height: props.height,
    borderRadius: borderRadius.value,
  };
});
</script>

<template>
  <div :style="styles" />
</template>
