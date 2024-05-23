<script setup lang="ts">
import GetStartedPageHeader from "./GetStartedPageHeader.vue";
import RecentWorkflowsList from "@/components/recentWorkflows/RecentWorkflowsList.vue";
</script>

<template>
  <div class="get-started">
    <div class="header"><GetStartedPageHeader /></div>
    <div class="recent">
      <RecentWorkflowsList />
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.get-started {
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
