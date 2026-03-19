<script setup lang="ts">
import SkeletonItem from "@/components/common/skeleton-loader/SkeletonItem.vue";
</script>

<template>
  <header>
    <div class="home-button-skeleton">
      <SkeletonItem
        width="80px"
        height="28px"
        :color1="$colors.BlackSemi"
        :color2="$colors.Masala"
        type="button"
        :style="{ border: '1px solid var(--knime-dove-gray)' }"
      />
    </div>
    <div :class="['toolbar']">
      <SkeletonItem
        width="140px"
        height="38px"
        :color1="$colors.BlackSemi"
        :color2="$colors.Masala"
      />

      <SkeletonItem
        width="140px"
        height="38px"
        :color1="$colors.BlackSemi"
        :color2="$colors.Masala"
      />

      <div class="buttons">
        <SkeletonItem
          width="80px"
          height="28px"
          :color1="$colors.BlackSemi"
          :color2="$colors.Masala"
          type="button"
          :style="{ border: '1px solid var(--knime-dove-gray)' }"
        />
        <SkeletonItem
          width="80px"
          height="28px"
          :color1="$colors.BlackSemi"
          :color2="$colors.Masala"
          type="button"
          :style="{ border: '1px solid var(--knime-dove-gray)' }"
        />
      </div>
    </div>
  </header>
</template>

<style lang="postcss" scoped>
header {
  position: relative;
  display: flex;
  height: var(--app-header-height);

  /* override padding set by webapps-common grid */
  padding: initial;
  background-color: var(--knime-masala);
  border-bottom: 4px solid var(--knime-yellow);

  & .toolbar {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 2px;
    align-content: center;
    align-items: center;
    width: 100%;
    height: 100%;

    & .buttons {
      display: flex;
      flex-shrink: 0;
      gap: 10px;
      align-items: center;
      justify-content: center;
      margin-right: 10px;
      margin-left: 15px;
    }
  }

  & .home-button-skeleton {
    display: flex;
    align-items: center;
    justify-content: left;
    width: auto;
    height: 100%;
    padding: 0 10px;
    background-color: var(--knime-masala);
  }
}
</style>
