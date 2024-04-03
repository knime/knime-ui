<script setup lang="ts">
import * as $colors from "@/style/colors.mjs";
import { computed } from "vue";

type Props = {
  color1?: string;
  color2?: string;
};

const props = withDefaults(defineProps<Props>(), {
  color1: $colors.GrayUltraLight,
  color2: $colors.Porcelain,
});

const styles = computed(() => {
  return {
    background: `linear-gradient(to right, ${props.color1} 0%, ${props.color2} 25%, ${props.color1} 50%)`,
    backgroundSize: "200% 100%",
    // animation is defined as a global style in index.css
    animation: "2s knight-rider linear infinite",
  };
});
</script>

<template>
  <div class="skeleton" :style="styles" />
</template>
