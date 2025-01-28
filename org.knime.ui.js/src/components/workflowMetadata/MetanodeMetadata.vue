<script setup lang="ts">
import ExternalResourcesList from "@/components/common/ExternalResourcesList.vue";
import SidebarPanelLayout from "../common/side-panel/SidebarPanelLayout.vue";
import SidebarPanelScrollContainer from "../common/side-panel/SidebarPanelScrollContainer.vue";

import MetadataLastEdit from "./MetadataLastEdit.vue";
import MetadataPlaceholder from "./MetadataPlaceholder.vue";
import MetadataTags from "./MetadataTags.vue";

interface Props {
  workflowId: string;
}

defineProps<Props>();
</script>

<template>
  <SidebarPanelLayout class="metanode-metadata">
    <template #header>
      <MetadataLastEdit :last-edit="undefined" />
    </template>

    <SidebarPanelScrollContainer>
      <MetadataPlaceholder
        padded
        text="A description is not available for metanodes. Select a node to show its description."
      />

      <ExternalResourcesList :model-value="[]" :editable="false" />

      <MetadataTags :model-value="[]" :editable="false" />
    </SidebarPanelScrollContainer>
  </SidebarPanelLayout>
</template>

<style scoped>
.metanode-metadata {
  height: 100%;
}
</style>
