<script setup lang="ts">
import SkeletonItem from "./SkeletonItem.vue";

type Props = {
  numberOfNodes?: number;
  displayMode?: string;
};

withDefaults(defineProps<Props>(), {
  numberOfNodes: 1,
  displayMode: "icon",
});
</script>

<template>
  <div
    v-for="index in numberOfNodes"
    :key="index"
    :class="`skeleton-node-${displayMode}`"
  >
    <template v-if="displayMode === 'icon'">
      <SkeletonItem :width="30" :height="10" />
      <SkeletonItem :width="60" :height="50" />
    </template>
    <template v-else>
      <SkeletonItem :height="25" width="fill" />
    </template>
  </div>
</template>

<style lang="postcss" scoped>
.skeleton-node-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  row-gap: 5px;
}

.skeleton-node-list {
  width: 100%;
  display: flex;
}
</style>
