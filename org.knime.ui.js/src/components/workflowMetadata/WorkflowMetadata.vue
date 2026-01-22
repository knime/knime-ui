<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { WorkflowInfo } from "@/api/gateway-api/generated-api";
import { isDesktop } from "@/environment";
import { workflowDomain } from "@/lib/workflow-domain";
import { useApplicationStore } from "@/store/application/application";
import { useSelectionStore } from "@/store/selection";
import { useWorkflowStore } from "@/store/workflow/workflow";

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

const isMetanode = computed(
  () => containerType.value === WorkflowInfo.ContainerTypeEnum.Metanode,
);

const singleMetanodeSelectedId = computed(() =>
  singleSelectedNode.value &&
  workflowDomain.node.isMetaNode(singleSelectedNode.value)
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
  <div v-if="workflow && workflow.metadata" class="metadata">
    <ProjectMetadata
      v-if="workflowDomain.project.isProjectMetadata(workflow.metadata)"
      :project-metadata="workflow.metadata"
      :project-id="workflow.projectId"
      :workflow-id="workflow.info.containerId"
      :single-metanode-selected-id="singleMetanodeSelectedId"
      :can-edit="isWorkflowWritable && !isMetanode"
      :can-open-workflow-configuration="
        isWorkflowWritable && !isMetanode && isDesktop()
      "
      @save="updateProjectMetadata"
    />

    <ComponentMetadata
      v-if="workflowDomain.project.isComponentMetadata(workflow.metadata)"
      :component-metadata="workflow.metadata"
      :project-id="workflow.projectId"
      :component-id="workflow.info.containerId"
      :available-port-types="availablePortTypes"
      :available-component-types="availableComponentTypes"
      :can-edit="isWorkflowWritable && !isMetanode"
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
