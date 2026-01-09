<script setup lang="ts">
import { SkeletonItem } from "@knime/components";
</script>

<template>
  <div class="skeleton-container">
    <SkeletonItem width="80%" height="16px" />
    <SkeletonItem width="100%" height="16px" />
  </div>
</template>

<style lang="postcss" scoped>
.skeleton-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}
</style>
