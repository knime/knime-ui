<script setup lang="ts">
import SkeletonItem from "@/components/common/skeleton-loader/SkeletonItem.vue";

type Props = {
  isLeftPanelOpen: boolean;
  isSidebarTransparent: boolean;
};

defineProps<Props>();
</script>

<template>
  <div v-if="isLeftPanelOpen" class="sidebar-content-skeleton">
    <template v-if="!isSidebarTransparent">
      <SkeletonItem height="16px" width="70%" />
      <SkeletonItem height="16px" />
      <SkeletonItem height="16px" />
      <SkeletonItem height="16px" width="30%" />
    </template>
  </div>
</template>

<style lang="postcss" scoped>
.sidebar-content-skeleton {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 370px;
  padding: 20px;
  border-right: 1px solid var(--knime-silver-sand);
  background: var(--sidebar-background-color);
}
</style>
