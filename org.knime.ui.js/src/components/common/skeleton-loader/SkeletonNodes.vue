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
  <div>
    <div
      v-for="index in numberOfNodes"
      :key="index"
      :class="`skeleton-node-${displayMode}`"
    >
      <template v-if="displayMode === 'icon'">
        <SkeletonItem
          :color1="$colors.SilverSandSemi"
          width="60px"
          height="10px"
          type="rounded"
        />
        <SkeletonItem
          :color1="$colors.SilverSandSemi"
          width="35px"
          height="35px"
          type="rounded"
        />
      </template>
      <template v-else>
        <SkeletonItem
          :color1="$colors.White"
          :color2="$colors.Porcelain"
          height="25px"
        />
      </template>
    </div>
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
