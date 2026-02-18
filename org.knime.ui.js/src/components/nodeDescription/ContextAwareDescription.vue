<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { workflowDomain } from "@/lib/workflow-domain";
import { TABS, usePanelStore } from "@/store/panel";
import { useSelectionStore } from "@/store/selection";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import WorkflowMetadata from "../workflowMetadata/WorkflowMetadata.vue";

import ComponentInstanceDescription from "./ComponentInstanceDescription.vue";
import NativeNodeDescription from "./NativeNodeDescription.vue";

/**
 * Shows metadata based on the current selection either of the whole workflow or the selected node (if its only one)
 */

const panelStore = usePanelStore();
const { isLeftPanelExpanded } = storeToRefs(panelStore);

const isNodeDescriptionTabActive = computed<boolean>(() =>
  panelStore.isTabActive(TABS.CONTEXT_AWARE_DESCRIPTION),
);

const nodeInteractionStore = useNodeInteractionsStore();
const { singleSelectedNode } = storeToRefs(useSelectionStore());

const showNodeDescription = computed(
  () =>
    singleSelectedNode.value &&
    !workflowDomain.node.isMetaNode(singleSelectedNode.value) &&
    isLeftPanelExpanded.value &&
    isNodeDescriptionTabActive.value,
);

const nodeInstanceData = computed(() => {
  if (
    !singleSelectedNode.value ||
    !workflowDomain.node.isNative(singleSelectedNode.value)
  ) {
    return null;
  }

  const { id, templateId } = singleSelectedNode.value;

  return {
    templateId,
    name: nodeInteractionStore.getNodeName(id),
    nodeFactory: nodeInteractionStore.getNodeFactory(id),
  };
});

const componentInstanceData = computed(() => {
  if (
    !singleSelectedNode.value ||
    !workflowDomain.node.isComponent(singleSelectedNode.value)
  ) {
    return null;
  }

  const { id, name } = singleSelectedNode.value;

  return {
    id,
    name,
  };
});
</script>

<template>
  <template v-if="showNodeDescription">
    <NativeNodeDescription
      v-if="nodeInstanceData"
      :name="nodeInstanceData.name"
      :node-template-id="nodeInstanceData.templateId"
      :node-factory="nodeInstanceData.nodeFactory"
    />

    <ComponentInstanceDescription
      v-if="componentInstanceData"
      :node-id="componentInstanceData.id"
      :name="componentInstanceData.name"
    />
  </template>

  <WorkflowMetadata v-else key="workflow-metadata" />
</template>
