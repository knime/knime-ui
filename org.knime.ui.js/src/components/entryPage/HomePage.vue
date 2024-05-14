<script setup lang="ts">
import EntryPageHeader from "./EntryPageHeader.vue";
import RecentWorkflows from "./RecentWorkflows.vue";
</script>

<template>
  <div class="home-page">
    <div class="header"><EntryPageHeader /></div>
    <div class="recent">
      <RecentWorkflows />
    </div>
  </div>
</template>

<style lang="postcss" scoped>
& .home-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--knime-gray-ultra-light);
  border-left: 1px solid var(--knime-silver-sand);

  & .header {
    border-bottom: 1px solid var(--knime-silver-sand);
  }

  & .grid-border {
    height: 1px;
  }
}
</style>
