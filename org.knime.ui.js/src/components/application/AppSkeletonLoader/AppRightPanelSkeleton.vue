<script setup lang="ts">
import SkeletonItem from "@/components/common/skeleton-loader/SkeletonItem.vue";

type Props = {
  width: number;
  withBorder?: boolean;
};

withDefaults(defineProps<Props>(), { withBorder: false });
</script>

<template>
  <div :class="['right-panel-skeleton', { 'with-border': withBorder }]">
    <SkeletonItem height="32px" />

    <div class="form-skeleton">
      <SkeletonItem width="50%" />
      <SkeletonItem width="50%" />
    </div>

    <div class="buttons-skeleton">
      <SkeletonItem width="100px" type="button" />
      <SkeletonItem width="100px" type="button" />
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.right-panel-skeleton {
  background: var(--knime-gray-ultra-light);
  height: 100%;
  margin-left: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: calc(v-bind("width") * 1px);

  &.with-border {
    border-left: 1px solid var(--knime-silver-sand);
  }

  & .form-skeleton {
    display: flex;
    height: 150px;
    gap: 8px;
    margin-top: 12px;
  }

  & .buttons-skeleton {
    margin-top: auto;
    height: 40px;
    display: flex;
    justify-content: space-between;
  }
}
</style>
