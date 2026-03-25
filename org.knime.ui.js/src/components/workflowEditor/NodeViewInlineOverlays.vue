<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import type { ComponentNode, NativeNode } from "@/api/gateway-api/generated-api";
import { workflowDomain } from "@/lib/workflow-domain";
import { useWorkflowStore } from "@/store/workflow/workflow";

import ComponentViewInlineOverlay from "./ComponentViewInlineOverlay.vue";
import NodeViewInlineOverlay from "./NodeViewInlineOverlay.vue";

const { activeWorkflow } = storeToRefs(useWorkflowStore());

/** Native nodes that are executed and have a view — rendered as inline overlays */
const viewNodes = computed((): NativeNode[] => {
  if (!activeWorkflow.value) return [];
  return Object.values(activeWorkflow.value.nodes).filter(
    (node): node is NativeNode =>
      workflowDomain.node.isNative(node) &&
      node.hasView &&
      node.state?.executionState === "EXECUTED",
  );
});

/** Component nodes that are executed and have a view — rendered as inline overlays */
const viewComponents = computed((): ComponentNode[] => {
  if (!activeWorkflow.value) return [];
  return Object.values(activeWorkflow.value.nodes).filter(
    (node): node is ComponentNode =>
      workflowDomain.node.isComponent(node) &&
      node.hasView &&
      node.state?.executionState === "EXECUTED",
  );
});
</script>

<template>
  <NodeViewInlineOverlay
    v-for="node in viewNodes"
    :key="node.id"
    :node="node"
  />
  <ComponentViewInlineOverlay
    v-for="node in viewComponents"
    :key="node.id"
    :node="node"
  />
</template>
