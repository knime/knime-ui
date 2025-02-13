<script setup lang="ts">
import { computed } from "vue";

import SidebarPanelLayout from "../common/side-panel/SidebarPanelLayout.vue";
import SidebarPanelScrollContainer from "../common/side-panel/SidebarPanelScrollContainer.vue";

import MetadataDescription from "./MetadataDescription.vue";
import MetadataPlaceholder from "./MetadataPlaceholder.vue";
import ProjectMetadata from "@/components/workflowMetadata/ProjectMetadata.vue";

interface Props {
  workflowId: string;
  projectMetadata: ProjectMetadata;
}

const props = defineProps<Props>();

const hasDescription = computed(() => Boolean(props.projectMetadata));
</script>

<template>
  <SidebarPanelLayout class="metanode-metadata">
    <template #header>
      <h2>Description</h2>
    </template>

    <SidebarPanelScrollContainer>
      <template v-if="hasDescription">
        <MetadataDescription
          :original-description="projectMetadata"
          :model-value="projectMetadata"
          :editable="false"
          :is-legacy="false"
        />
      </template>
      <template v-else>
        <MetadataPlaceholder
          padded
          text="A description is not available for metanodes. Select a node or a component to show their description."
        />
      </template>
    </SidebarPanelScrollContainer>
  </SidebarPanelLayout>
</template>

<style scoped>
.metanode-metadata {
  height: 100%;
}
</style>
