<script setup lang="ts">
import { computed } from "vue";

import SidebarPanelLayout from "../common/side-panel/SidebarPanelLayout.vue";
import SidebarPanelScrollContainer from "../common/side-panel/SidebarPanelScrollContainer.vue";

import MetadataDescription from "./MetadataDescription.vue";
import MetadataPlaceholder from "./MetadataPlaceholder.vue";

interface Props {
  workflowId: string;
  parentDescription: string;
}

const props = defineProps<Props>();

const hasDescription = computed(() => Boolean(props.parentDescription));
</script>

<template>
  <SidebarPanelLayout class="metanode-metadata">
    <template #header>
      <h2>Description</h2>
    </template>

    <SidebarPanelScrollContainer>
      <template v-if="hasDescription">
        <MetadataDescription
          :original-description="parentDescription"
          :model-value="parentDescription"
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
