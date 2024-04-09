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
      <SkeletonItem
        :color1="$colors.SilverSandSemi"
        :width="60"
        :height="10"
        :border-radius="2"
      />
      <SkeletonItem
        :color1="$colors.SilverSandSemi"
        :width="35"
        :height="35"
        :border-radius="3"
      />
    </template>
    <template v-else>
      <SkeletonItem
        :color1="$colors.White"
        :color2="$colors.Porcelain"
        :height="25"
        width="fill"
      />
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
