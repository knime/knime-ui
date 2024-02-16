<script setup lang="ts">
import { computed } from "vue";
import { useStore } from "@/composables/useStore";
import WorkflowMetadata from "@/components/workflowMetadata/WorkflowMetadata.vue";
import NodeDescription from "@/components/nodeRepository/NodeDescription.vue";
import { isNodeComponent, isNodeMetaNode } from "@/util/nodeUtil";

/**
 * Shows metadata based on the current selection either of the whole workflow or the selected node (if its only one)
 */
const store = useStore();

const singleSelectedNode = computed(
  () => store.getters["selection/singleSelectedNode"],
);
const showNodeDescription = computed(
  () => singleSelectedNode.value && !isNodeMetaNode(singleSelectedNode.value),
);
const isComponentSelected = computed(() =>
  isNodeComponent(singleSelectedNode.value),
);
const selectedNode = computed(() => {
  if (isComponentSelected.value) {
    const { id, name } = singleSelectedNode.value;

    return { id, name };
  }

  // transform this into a node repo like node object
  const { id } = singleSelectedNode.value;
  return {
    id,
    name: store.getters["workflow/getNodeName"](id),
    nodeFactory: store.getters["workflow/getNodeFactory"](id),
  };
});
</script>

<template>
  <div class="context-aware-description">
    <NodeDescription
      v-if="showNodeDescription"
      class="node-description"
      :selected-node="selectedNode"
      :is-component="isComponentSelected"
    />
    <WorkflowMetadata v-else key="workflow-metadata" />
  </div>
</template>

<style lang="postcss">
.context-aware-description {
  /* required for the scrollbar of NodeDescription to work proper */
  height: 100%;
}

.node-description {
  /* required for sticky header in NodeDescription to have a background to inherit */
  background-color: var(--knime-porcelain);
}
</style>
