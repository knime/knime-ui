<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";

import NodeOutput from "@/components/uiExtensions/NodeOutput.vue";
import IncompatibleNodeConfigPlaceholder from "@/components/uiExtensions/nodeConfig/IncompatibleNodeConfigPlaceholder.vue";
import NodeConfigWrapper from "@/components/uiExtensions/nodeConfig/NodeConfigWrapper.vue";
import { useNodeConfigurationStore } from "@/store/nodeConfiguration/nodeConfiguration";
import { usePanelStore } from "@/store/panel";
import { useSelectionStore } from "@/store/selection";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";

const panelStore = usePanelStore();
const { isRightPanelExpanded } = storeToRefs(panelStore);

const { querySelection } = useSelectionStore();
const { getSelectedNodes } = querySelection("committed");

const nodeInteractionsStore = useNodeInteractionsStore();
const nodeConfigStore = useNodeConfigurationStore();

const displayedNodes = computed(() => getSelectedNodes.value.slice(0, 2));
const isSplit = computed(() => displayedNodes.value.length > 1);

const configNodeIdx = ref(0);

// Sync config focus node with split view state
watch(
  displayedNodes,
  (nodes) => {
    configNodeIdx.value = 0;
    nodeConfigStore.setConfigFocusNodeId(nodes.length > 1 ? nodes[0].id : null);
  },
  { immediate: true },
);

const selectConfigNode = (idx: number) => {
  configNodeIdx.value = idx;
  nodeConfigStore.setConfigFocusNodeId(displayedNodes.value[idx].id);
};
</script>

<template>
  <div class="docked-config-panel">
    <div class="output-section">
      <NodeOutput />
    </div>
    <template v-if="isRightPanelExpanded">
      <div class="panel-divider" />
      <div class="config-section">
        <!-- Node switcher: shown when two nodes are selected (split view) -->
        <div v-if="isSplit" class="config-node-tabs">
          <button
            v-for="(node, idx) in displayedNodes"
            :key="node.id"
            class="config-node-tab"
            :class="{ active: configNodeIdx === idx }"
            :title="nodeInteractionsStore.getNodeName(node.id)"
            @click="selectConfigNode(idx)"
          >
            {{ nodeInteractionsStore.getNodeName(node.id) }}
          </button>
        </div>
        <NodeConfigWrapper @close="panelStore.isRightPanelExpanded = false">
          <template #inactive>
            <IncompatibleNodeConfigPlaceholder />
          </template>
        </NodeConfigWrapper>
      </div>
    </template>
  </div>
</template>

<style lang="postcss" scoped>
.docked-config-panel {
  display: flex;
  flex-direction: row;
  height: 100%;
  overflow: hidden;
  background: var(--knime-white);
}

.output-section {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.panel-divider {
  width: 1px;
  flex-shrink: 0;
  background-color: var(--kds-color-border-default, var(--knime-silver-sand));
}

.config-section {
  width: 500px;
  flex-shrink: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.config-node-tabs {
  display: flex;
  flex-shrink: 0;
  border-bottom: 1px solid var(--kds-color-border-default, var(--knime-silver-sand));
}

.config-node-tab {
  flex: 1;
  padding: 6px 8px;
  font-size: 12px;
  font-weight: 500;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--knime-stone-gray);
  cursor: pointer;
  transition: color 100ms, border-color 100ms;

  &:hover {
    color: var(--knime-masala);
  }

  &.active {
    color: var(--knime-masala);
    border-bottom-color: var(--knime-cornflower);
  }
}
</style>
