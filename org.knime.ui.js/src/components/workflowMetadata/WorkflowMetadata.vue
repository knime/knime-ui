<script setup lang="ts">
import { computed } from "vue";
import { useStore } from "vuex";

import { WorkflowInfo } from "@/api/gateway-api/generated-api";
import type { RootStoreState } from "@/store/types";

import ProjectMetadata, {
  type SaveEventPayload as SaveProjectEventPayload,
} from "./ProjectMetadata.vue";
import ComponentMetadata, {
  type SaveEventPayload as SaveComponentEventPayload,
} from "./ComponentMetadata.vue";
import type { ComponentMetadata as ComponentMetadataType } from "@/api/custom-types";

const store = useStore<RootStoreState>();

const availablePortTypes = computed(
  () => store.state.application.availablePortTypes,
);
const workflow = computed(() => store.state.workflow!.activeWorkflow!);
const containerType = computed(() => workflow.value!.info.containerType);

const isProjectType = computed(
  () => containerType.value === WorkflowInfo.ContainerTypeEnum.Project,
);
const isComponentType = computed(
  () => containerType.value === WorkflowInfo.ContainerTypeEnum.Component,
);

const isProject = computed(() => {
  return (
    isProjectType.value &&
    workflow.value.projectMetadata &&
    !workflow.value.componentMetadata
  );
});

const isComponent = computed(() => {
  return (
    (isComponentType.value || isProjectType.value) &&
    workflow.value.componentMetadata &&
    !workflow.value.projectMetadata
  );
});

const isMetanode = computed(
  () => containerType.value === WorkflowInfo.ContainerTypeEnum.Metanode,
);

const updateProjectMetadata = ({
  description,
  links,
  tags,
  projectId,
  workflowId,
}: SaveProjectEventPayload) => {
  store.dispatch("workflow/updateWorkflowMetadata", {
    projectId,
    workflowId,
    description,
    links,
    tags,
  });
};

const updateComponentMetadata = ({
  projectId,
  workflowId,
  description,
  type,
  icon,
  inPorts,
  outPorts,
  links,
  tags,
}: SaveComponentEventPayload) => {
  store.dispatch("workflow/updateComponentMetadata", {
    projectId,
    workflowId, // in this case the componentId
    description,
    type,
    icon,
    inPorts,
    outPorts,
    links,
    tags,
  });
};
</script>

<template>
  <div v-if="workflow && !isMetanode" class="metadata">
    <ProjectMetadata
      v-if="isProject && workflow.projectMetadata"
      @save="updateProjectMetadata"
    />

    <ComponentMetadata
      v-if="isComponent && workflow.componentMetadata"
      :component-metadata="workflow.componentMetadata as ComponentMetadataType"
      :project-id="workflow.projectId"
      :component-id="workflow.info.containerId"
      :available-port-types="availablePortTypes"
      @save="updateComponentMetadata"
    />
  </div>

  <!-- Render an element to prevent issue with transition-group and conditional elements -->
  <div v-else />
</template>

<style lang="postcss" scoped>
.metadata {
  overflow: hidden auto;
  height: 100%;
  padding: 8px 20px 20px;
  font-size: 16px;
  color: var(--knime-masala);

  & :deep(h2) {
    margin: 15px 0 5px;
    font-size: 16px;
    font-weight: 500;
    line-height: 36px;
  }

  & :deep(h2.section) {
    border-bottom: 1px solid var(--knime-silver-sand);
  }

  & :deep(h2.form) {
    margin: 30px 0 20px;
  }

  & > *:last-child {
    margin-bottom: 0;
  }
}
</style>
