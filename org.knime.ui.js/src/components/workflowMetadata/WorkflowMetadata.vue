<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { type ComponentMetadata as ComponentMetadataType } from "@/api/custom-types";
import { WorkflowInfo } from "@/api/gateway-api/generated-api";
import { useApplicationStore } from "@/store/application/application";
import { useSelectionStore } from "@/store/selection";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { isNodeMetaNode } from "@/util/nodeUtil";
import * as projectUtil from "@/util/projectUtil";

import ComponentMetadata, {
  type SaveEventPayload as SaveComponentEventPayload,
} from "./ComponentMetadata.vue";
import ProjectMetadata, {
  type SaveEventPayload as SaveProjectEventPayload,
} from "./ProjectMetadata.vue";

const { availablePortTypes, availableComponentTypes } = storeToRefs(
  useApplicationStore(),
);

const workflowStore = useWorkflowStore();
const { activeWorkflow: workflow, isWritable: isWorkflowWritable } =
  storeToRefs(workflowStore);

const containerType = computed(() => workflow.value?.info.containerType);
const { singleSelectedNode } = storeToRefs(useSelectionStore());

const isWorkflowProject = computed(
  () =>
    projectUtil.isWorkflowProjectType(workflow.value!.info.containerType) &&
    projectUtil.isWorkflowProjectMetadata(workflow.value!.metadata),
);

const isComponentProject = computed(
  () =>
    projectUtil.isComponentProjectType(workflow.value!.info.containerType) &&
    projectUtil.isComponentMetadata(workflow.value!.metadata),
);

const isMetanode = computed(
  () => containerType.value === WorkflowInfo.ContainerTypeEnum.Metanode,
);

const singleMetanodeSelectedId = computed(() =>
  singleSelectedNode.value && isNodeMetaNode(singleSelectedNode.value)
    ? singleSelectedNode.value.id
    : null,
);

const updateProjectMetadata = ({
  description,
  links,
  tags,
  projectId,
  workflowId,
}: SaveProjectEventPayload) => {
  workflowStore.updateWorkflowMetadata({
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
  workflowStore.updateComponentMetadata({
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
  <div v-if="workflow" class="metadata">
    <ProjectMetadata
      v-if="isWorkflowProject || isMetanode"
      :project-metadata="workflow.metadata!"
      :project-id="workflow.projectId"
      :workflow-id="workflow.info.containerId"
      :is-workflow-writable="isWorkflowWritable"
      :single-metanode-selected-id="singleMetanodeSelectedId"
      @save="updateProjectMetadata"
    />

    <ComponentMetadata
      v-if="isComponentProject || isMetanode"
      :component-metadata="workflow.metadata! as ComponentMetadataType"
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
