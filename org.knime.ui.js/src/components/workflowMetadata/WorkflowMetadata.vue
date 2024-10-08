<script setup lang="ts">
import { computed } from "vue";

import { WorkflowInfo } from "@/api/gateway-api/generated-api";
import { useStore } from "@/composables/useStore";
import { isNodeMetaNode } from "@/util/nodeUtil";
import * as projectUtil from "@/util/projectUtil";

import ComponentMetadata, {
  type SaveEventPayload as SaveComponentEventPayload,
} from "./ComponentMetadata.vue";
import ProjectMetadata, {
  type SaveEventPayload as SaveProjectEventPayload,
} from "./ProjectMetadata.vue";

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

const isWorkflowProject = computed(() =>
  projectUtil.isWorkflowProject(workflow.value),
);

const isComponentProject = computed(() =>
  projectUtil.isComponentProject(workflow.value),
);

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
      v-if="isWorkflowProject && workflow.projectMetadata"
      :project-metadata="workflow.projectMetadata"
      :project-id="workflow.projectId"
      :workflow-id="workflow.info.containerId"
      :is-workflow-writable="isWorkflowWritable"
      :single-metanode-selected-id="singleMetanodeSelectedId"
      @save="updateProjectMetadata"
    />

    <ComponentMetadata
      v-if="isComponentProject && workflow.componentMetadata"
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
  /** required for scrolling */
  height: 100%;
}
</style>
