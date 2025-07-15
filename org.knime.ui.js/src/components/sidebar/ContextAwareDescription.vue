<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import type { NativeNode } from "@/api/gateway-api/generated-api";
import { TABS, usePanelStore } from "@/store/panel";
import { useSelectionStore } from "@/store/selection";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { isNodeComponent, isNodeMetaNode } from "@/util/nodeUtil";
import NodeDescription from "../nodeDescription/NodeDescription.vue";
import WorkflowMetadata from "../workflowMetadata/WorkflowMetadata.vue";

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
  () => singleSelectedNode.value && !isNodeMetaNode(singleSelectedNode.value),
);

const selectedNode = computed(() => {
  if (!singleSelectedNode.value) {
    return null;
  }

  if (isNodeComponent(singleSelectedNode.value)) {
    const { id, name } = singleSelectedNode.value;

    return { id, name };
  }

  // transform this into a NodeTemplate-like object
  const { id, templateId } = singleSelectedNode.value as NativeNode;

  return {
    id: templateId,
    name: nodeInteractionStore.getNodeName(id),
    nodeFactory: nodeInteractionStore.getNodeFactory(id),
  };
});
</script>

<template>
  <NodeDescription
    v-if="showNodeDescription"
    class="node-description"
    :params="selectedNode"
    :is-visible="isNodeDescriptionTabActive && isLeftPanelExpanded"
  />
  <WorkflowMetadata v-else key="workflow-metadata" />
</template>
