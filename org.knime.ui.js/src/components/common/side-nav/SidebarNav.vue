<script setup lang="ts">
import SkeletonItem from "../skeleton-loader/SkeletonItem.vue";

type Props = {
  showSkeleton?: boolean;
};

withDefaults(defineProps<Props>(), { showSkeleton: false });
</script>

<template>
  <ul v-bind="$attrs" class="sidebar-nav">
    <slot />
  </ul>

  <div v-if="showSkeleton" class="side-menu-skeleton">
    <div v-for="index in 4" :key="index" class="menu-skeleton-item">
      <SkeletonItem
        :color1="$colors.SilverSandSemi"
        width="100%"
        height="2px"
      />
      <div class="skeleton-list-provider">
        <SkeletonItem
          :color1="$colors.SilverSandSemi"
          width="50%"
          height="30px"
        />
        <SkeletonItem
          :color1="$colors.SilverSandSemi"
          width="70px"
          height="30px"
          type="button"
        />
      </div>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
/* list style reset */
.sidebar-nav,
.sidebar-nav :deep(ul) {
  margin: 0;
  list-style-type: none;
  padding: 0;
}

.side-menu-skeleton {
  padding: 0;

  & .menu-skeleton-item {
    display: flex;
    flex-direction: column;

    & .skeleton-list-provider {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      padding: 5px 0 20px;
    }
  }
}
</style>
