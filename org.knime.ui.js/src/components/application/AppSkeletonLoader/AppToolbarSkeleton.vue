<script setup lang="ts">
import SkeletonItem from "@/components/common/skeleton-loader/SkeletonItem.vue";
import { isBrowser, isDesktop } from "@/environment";

type Props = {
  isChangingBetweenWorkflows: boolean;
};

defineProps<Props>();
</script>

<template>
  <div class="toolbar-skeleton-wrapper">
    <template v-if="!isChangingBetweenWorkflows">
      <SkeletonItem
        v-if="isDesktop()"
        width="100px"
        type="button"
        class="button-skeleton-normal"
      />
      <SkeletonItem
        v-else-if="isBrowser()"
        width="28px"
        height="28px"
        type="icon-button"
      />
      <SkeletonItem width="28px" height="28px" type="icon-button" />
      <SkeletonItem width="28px" height="28px" type="icon-button" />
      <SkeletonItem
        width="100px"
        type="button"
        class="button-skeleton-normal"
      />
      <SkeletonItem
        width="100px"
        type="button"
        class="button-skeleton-normal"
      />
      <SkeletonItem
        width="100px"
        type="button"
        class="button-skeleton-normal"
      />
    </template>
  </div>
</template>

<style lang="postcss" scoped>
.toolbar-skeleton-wrapper {
  background: var(--knime-porcelain);
  border-bottom: 1px solid var(--knime-silver-sand);
  min-height: var(--app-toolbar-height);
  display: flex;
  gap: var(--space-4);
  padding: 10px;
  align-items: center;
}
</style>
