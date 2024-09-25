<script setup lang="ts">
import { computed } from "vue";
import { useStore } from "@/composables/useStore";
import { TABS } from "@/store/panel";
import WorkflowMetadata from "@/components/workflowMetadata/WorkflowMetadata.vue";
import NodeDescription from "@/components/nodeDescription/NodeDescription.vue";
import { isNodeComponent, isNodeMetaNode } from "@/util/nodeUtil";
import type {
  ComponentNode,
  NativeNode,
} from "@/api/gateway-api/generated-api";

/**
 * Shows metadata based on the current selection either of the whole workflow or the selected node (if its only one)
 */
const store = useStore();
const isNodeDescriptionTabActive = computed<boolean>(() =>
  store.getters["panel/isTabActive"](TABS.CONTEXT_AWARE_DESCRIPTION),
);

const isSidebarExpanded = computed(() => store.state.panel.expanded);

const singleSelectedNode = computed<NativeNode | ComponentNode>(
  () => store.getters["selection/singleSelectedNode"],
);

const showNodeDescription = computed(
  () => singleSelectedNode.value && !isNodeMetaNode(singleSelectedNode.value),
);

const selectedNode = computed(() => {
  if (isNodeComponent(singleSelectedNode.value)) {
    const { id, name } = singleSelectedNode.value;

    return { id, name };
  }

  // transform this into a NodeTemplate-like object
  const { id, templateId } = singleSelectedNode.value as NativeNode;

  return {
    id: templateId,
    name: store.getters["workflow/getNodeName"](id),
    nodeFactory: store.getters["workflow/getNodeFactory"](id),
  };
});
</script>

<template>
  <NodeDescription
    v-if="showNodeDescription"
    class="node-description"
    :params="selectedNode"
    :is-visible="isNodeDescriptionTabActive && isSidebarExpanded"
  />
  <WorkflowMetadata v-else key="workflow-metadata" />
</template>
