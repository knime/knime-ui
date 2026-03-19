<script setup lang="ts">
import SkeletonItem from "@/components/common/skeleton-loader/SkeletonItem.vue";

type Props = {
  width: number;
  withBorder?: boolean;
  transparent?: boolean;
};

withDefaults(defineProps<Props>(), { withBorder: false });
</script>

<template>
  <div
    :class="[
      'right-panel-skeleton',
      { 'with-border': withBorder, transparent },
    ]"
  >
    <template v-if="!transparent">
      <SkeletonItem height="32px" />
      <div class="form-skeleton">
        <SkeletonItem width="50%" />
        <SkeletonItem width="50%" />
      </div>
      <div class="buttons-skeleton">
        <SkeletonItem width="100px" type="button" />
        <SkeletonItem width="100px" type="button" />
      </div>
    </template>
  </div>
</template>

<style lang="postcss" scoped>
.right-panel-skeleton {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: calc(v-bind("width") * 1px);
  height: 100%;
  padding: 10px;
  margin-left: auto;
  background: var(--knime-gray-ultra-light);

  &.with-border {
    border-left: 1px solid var(--knime-silver-sand);
  }

  &.transparent {
    background: transparent;
  }

  & .form-skeleton {
    display: flex;
    gap: 8px;
    height: 150px;
    margin-top: 12px;
  }

  & .buttons-skeleton {
    display: flex;
    justify-content: space-between;
    height: 40px;
    margin-top: auto;
  }
}
</style>
