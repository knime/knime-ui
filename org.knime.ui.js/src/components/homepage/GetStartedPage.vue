<script setup lang="ts">
import ExampleWorkflows from "./ExampleWorkflows.vue";
import RecentWorkflowsList from "./RecentWorkflowsList.vue";
</script>

<template>
  <div class="get-started">
    <div class="header">
      <ExampleWorkflows />
    </div>
    <div>
      <RecentWorkflowsList />
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.get-started {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background-color: var(--knime-porcelain);
  border-left: 1px solid var(--knime-silver-sand);

  & .header {
    border-bottom: 1px solid var(--knime-silver-sand);
  }
}
</style>
