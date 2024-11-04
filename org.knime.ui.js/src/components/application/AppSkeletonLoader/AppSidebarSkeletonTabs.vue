<script setup lang="ts">
import SkeletonItem from "@/components/common/skeleton-loader/SkeletonItem.vue";

type Props = {
  isChangingBetweenWorkflows: boolean;
};

defineProps<Props>();
</script>

<template>
  <div class="sidebar-tabs-skeleton">
    <template v-if="!isChangingBetweenWorkflows">
      <SkeletonItem
        height="50px"
        :style="{ 'border-bottom': '1px solid var(--knime-silver-sand)' }"
      />
      <SkeletonItem
        height="50px"
        :style="{ 'border-bottom': '1px solid var(--knime-silver-sand)' }"
      />
      <SkeletonItem
        height="50px"
        :style="{ 'border-bottom': '1px solid var(--knime-silver-sand)' }"
      />
    </template>
  </div>
</template>

<style lang="postcss" scoped>
.sidebar-tabs-skeleton {
  background: var(--knime-masala);
  min-width: var(--app-side-bar-buttons-width);
  height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>
