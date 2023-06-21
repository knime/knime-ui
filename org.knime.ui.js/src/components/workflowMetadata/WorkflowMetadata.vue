<script setup lang="ts">
import { ref, computed } from "vue";
import { useStore } from "vuex";

import { WorkflowInfo } from "@/api/gateway-api/generated-api";
import type { RootStoreState } from "@/store/types";

import ProjectMetadata from "./ProjectMetadata.vue";
import ComponentMetadata from "./ComponentMetadata.vue";

const isEditing = ref(false);

const store = useStore<RootStoreState>();

const availablePortTypes = computed(
  () => store.state.application.availablePortTypes
);
const workflow = computed(() => store.state.workflow.activeWorkflow);
const containerType = computed(() => workflow.value.info.containerType);

const isProject = computed(
  () => containerType.value === WorkflowInfo.ContainerTypeEnum.Project
);

const isComponent = computed(
  () => containerType.value === WorkflowInfo.ContainerTypeEnum.Component
);

const isMetanode = computed(
  () => containerType.value === WorkflowInfo.ContainerTypeEnum.Metanode
);

const updateMetadata = ({ description, links, tags }) => {
  isEditing.value = false;

  store.dispatch("workflow/updateWorkflowMetadata", {
    description,
    links,
    tags,
  });
};
</script>

<template>
  <div v-if="workflow && !isMetanode" class="metadata">
    <ProjectMetadata
      v-if="isProject"
      :is-editing="isEditing"
      :workflow="workflow"
      @edit-start="isEditing = true"
      @edit-save="updateMetadata"
      @edit-cancel="isEditing = false"
    />

    <ComponentMetadata
      v-if="isComponent"
      :workflow="workflow"
      :available-port-types="availablePortTypes"
    />
  </div>

  <!-- Render an element to prevent issue with transition-group and conditional elements -->
  <div v-else />
</template>

<style lang="postcss" scoped>
.metadata {
  overflow-y: auto;
  overflow-x: hidden;
  height: 100%;
  padding: 8px 20px 20px;
  font-family: "Roboto Condensed", sans-serif;
  font-size: 16px;
  color: var(--knime-masala);

  & > *:last-child {
    margin-bottom: 0;
  }
}
</style>
