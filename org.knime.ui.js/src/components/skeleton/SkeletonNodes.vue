<script setup lang="ts">
import SkeletonItem from "./SkeletonItem.vue";

type Props = {
  numberOfNodes?: number;
};

withDefaults(defineProps<Props>(), {
  numberOfNodes: 1,
});
</script>

<template>
  <div v-for="index in numberOfNodes" :key="index" class="skeleton-node">
    <SkeletonItem :width="30" :height="10" />
    <SkeletonItem :width="60" :height="50" />
  </div>
</template>

<style lang="postcss" scoped>
.skeleton-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  row-gap: 5px;
}
</style>
