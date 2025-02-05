<script setup lang="ts">
import SidebarPanelLayout from "../common/side-panel/SidebarPanelLayout.vue";
import SidebarPanelScrollContainer from "../common/side-panel/SidebarPanelScrollContainer.vue";

import MetadataPlaceholder from "./MetadataPlaceholder.vue";

interface Props {
  workflowId: string;
}

defineProps<Props>();
</script>

<template>
  <SidebarPanelLayout class="metanode-metadata">
    <template #header>
      <h2>Description</h2>
    </template>

    <SidebarPanelScrollContainer>
      <MetadataPlaceholder
        padded
        text="A description is not available for metanodes. Select a node or a component to show their description."
      />
    </SidebarPanelScrollContainer>
  </SidebarPanelLayout>
</template>

<style scoped>
.metanode-metadata {
  height: 100%;
}
</style>
