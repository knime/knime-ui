<script setup lang="ts">
type Props = {
  width: number;
  height: number;
};

defineProps<Props>();
</script>

<template>
  <div
    class="skeleton-item"
    :style="{ width: `${width}px`, height: `${height}px` }"
  />
</template>

<style lang="postcss" scoped>
@keyframes shine {
  to {
    background-position-x: -200%;
  }
}

.skeleton-item {
  background: linear-gradient(
    90deg,
    var(--knime-white) 8%,
    var(--knime-porcelain) 18%,
    var(--knime-white) 33%
  );
  background-size: 200% 100%;
  animation: 1.5s shine linear infinite;
}
</style>
