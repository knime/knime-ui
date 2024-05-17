<script setup lang="ts">
import { computed } from "vue";

import { WorkflowInfo } from "@/api/gateway-api/generated-api";
import { useStore } from "@/composables/useStore";

import ProjectMetadata, {
  type SaveEventPayload as SaveProjectEventPayload,
} from "./ProjectMetadata.vue";
import ComponentMetadata, {
  type SaveEventPayload as SaveComponentEventPayload,
} from "./ComponentMetadata.vue";
import { isNodeMetaNode } from "@/util/nodeUtil";

const store = useStore();

const availablePortTypes = computed(
  () => store.state.application.availablePortTypes,
);
const availableComponentTypes = computed(
  () => store.state.application.availableComponentTypes,
);
const workflow = computed(() => store.state.workflow!.activeWorkflow!);
const containerType = computed(() => workflow.value!.info.containerType);

const isWorkflowWritable = computed<boolean>(
  () => store.getters["workflow/isWritable"],
);

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

const singleMetanodeSelectedId = computed<string | null>(
  () =>
    store.getters["selection/singleSelectedNode"] &&
    isNodeMetaNode(store.getters["selection/singleSelectedNode"]) &&
    store.getters["selection/singleSelectedNode"].id,
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
      :project-metadata="workflow.projectMetadata"
      :project-id="workflow.projectId"
      :workflow-id="workflow.info.containerId"
      :is-workflow-writable="isWorkflowWritable"
      :single-metanode-selected-id="singleMetanodeSelectedId"
      @save="updateProjectMetadata"
    />

    <ComponentMetadata
      v-if="isComponent && workflow.componentMetadata"
      :component-metadata="workflow.componentMetadata"
      :project-id="workflow.projectId"
      :component-id="workflow.info.containerId"
      :available-port-types="availablePortTypes"
      :available-component-types="availableComponentTypes"
      :is-workflow-writable="isWorkflowWritable"
      :single-metanode-selected-id="singleMetanodeSelectedId"
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
