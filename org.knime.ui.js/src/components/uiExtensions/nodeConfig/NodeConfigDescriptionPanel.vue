<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { FunctionButton } from "@knime/components";
import CloseIcon from "@knime/styles/img/icons/close.svg";

import ComponentInstanceDescription from "@/components/nodeDescription/ComponentInstanceDescription.vue";
import NativeNodeDescription from "@/components/nodeDescription/NativeNodeDescription.vue";
import { workflowDomain } from "@/lib/workflow-domain";
import { useNodeConfigurationStore } from "@/store/nodeConfiguration/nodeConfiguration";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";

/**
 * Shows the node description for the node currently open in the configuration
 * panel. Rendered as a companion floating panel when the user toggles the "i"
 * button in the node config header.
 */

const nodeConfigStore = useNodeConfigurationStore();
const { activeContext } = storeToRefs(nodeConfigStore);
const nodeInteractionsStore = useNodeInteractionsStore();

const nativeNodeData = computed(() => {
  const ctx = activeContext.value;
  if (!ctx || !workflowDomain.node.isNative(ctx.node)) {
    return null;
  }
  const { id, templateId } = ctx.node;
  return {
    templateId,
    name: nodeInteractionsStore.getNodeName(id),
    nodeFactory: nodeInteractionsStore.getNodeFactory(id),
  };
});

const componentNodeData = computed(() => {
  const ctx = activeContext.value;
  if (!ctx || !workflowDomain.node.isComponent(ctx.node)) {
    return null;
  }
  const { id } = ctx.node;
  return {
    id,
    name: nodeInteractionsStore.getNodeName(id),
  };
});
</script>

<template>
  <div class="node-config-description-panel">
    <div class="header">
      <span class="title">Node Description</span>
      <FunctionButton
        title="Close description panel"
        compact
        class="close-btn"
        @click="nodeConfigStore.showNodeDescriptionPanel = false"
      >
        <CloseIcon />
      </FunctionButton>
    </div>

    <div class="content">
      <NativeNodeDescription
        v-if="nativeNodeData"
        :name="nativeNodeData.name"
        :node-template-id="nativeNodeData.templateId"
        :node-factory="nativeNodeData.nodeFactory"
      />

      <ComponentInstanceDescription
        v-else-if="componentNodeData"
        :node-id="componentNodeData.id"
        :name="componentNodeData.name"
      />

      <div v-else class="placeholder">
        No description available for this node.
      </div>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.node-config-description-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background-color: var(--kds-color-surface-default);
}

.header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-8) var(--space-8) var(--space-8) var(--space-16);
  border-bottom: 1px solid var(--kds-color-border-default);
  cursor: move;
  user-select: none;
}

.title {
  font-size: 13px;
  font-weight: 600;
  color: var(--kds-color-text-and-icon-default);
}

.close-btn {
  flex-shrink: 0;
  cursor: pointer;
}

.content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.placeholder {
  padding: var(--space-16);
  color: var(--kds-color-text-and-icon-neutral);
  font-size: 13px;
}
</style>
