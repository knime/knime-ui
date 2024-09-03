<script setup lang="ts">
import SkeletonItem from "@/components/common/skeleton-loader/SkeletonItem.vue";

type Props = {
  isChangingBetweenWorkflows: boolean;
};

defineProps<Props>();
</script>

<template>
  <div class="toolbar-skeleton-wrapper">
    <template v-if="!isChangingBetweenWorkflows">
      <SkeletonItem
        width="30px"
        height="30px"
        type="icon-button"
        :style="{ border: '1px solid var(--knime-silver-sand)' }"
      />
      <SkeletonItem
        width="30px"
        height="30px"
        type="icon-button"
        :style="{ border: '1px solid var(--knime-silver-sand)' }"
      />
      <SkeletonItem
        width="100px"
        type="button"
        class="button-skeleton-normal"
        :style="{ border: '1px solid var(--knime-silver-sand)' }"
      />
      <SkeletonItem
        width="100px"
        type="button"
        class="button-skeleton-normal"
        :style="{ border: '1px solid var(--knime-silver-sand)' }"
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
  gap: 10px;
  padding: 10px;
  align-items: center;
}
</style>
