<script setup lang="ts">
import { computed, toRefs } from "vue";
import * as $colors from "@/style/colors.mjs";

type Props = {
  width: number | "fill";
  height: number | "fill";
  color1?: string;
  color2?: string;
  borderRadius?: number;
};

const props = withDefaults(defineProps<Props>(), {
  color1: $colors.GrayUltraLight,
  color2: $colors.Porcelain,
  borderRadius: 0,
});

const { width, height, borderRadius } = toRefs(props);

const styles = computed(() => {
  return {
    background: `linear-gradient(to right, ${props.color1} 0%, ${props.color2} 25%, ${props.color1} 50%)`,
    backgroundSize: "200% 100%",
    width: width.value === "fill" ? "100%" : `${width.value}px`,
    height: height.value === "fill" ? "100%" : `${height.value}px`,
    borderRadius: `${borderRadius.value}px`,
  };
});
</script>

<template>
  <div class="skeleton-item" :style="styles" />
</template>

<style lang="postcss" scoped>
@keyframes shine {
  to {
    background-position-x: -200%;
  }
}

.skeleton-item {
  animation: 1.5s shine linear infinite;
}
</style>
