<script setup lang="ts">
import SkeletonItem from "../common/skeleton-loader/SkeletonItem.vue";
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
  display: flex;
  height: var(--app-header-height);
  background-color: var(--knime-masala);
  border-bottom: 4px solid var(--knime-yellow);
  position: relative;

  /* override padding set by webapps-common grid */
  padding: initial;

  & .toolbar {
    width: 100%;
    height: 100%;
    display: grid;
    align-items: center;
    align-content: center;
    grid-template-columns: auto 1fr auto;
    gap: 2px;

    & .buttons {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-left: 15px;
      gap: 10px;
      margin-right: 10px;
    }
  }

  & .home-button-skeleton {
    display: flex;
    align-items: center;
    justify-content: left;
    width: auto;
    background-color: var(--knime-masala);
    height: 100%;
    padding: 0 10px;
  }
}
</style>
