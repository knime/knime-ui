<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { useApplicationStore } from "@/store/application/application";
import { useNodeOutputStore } from "@/store/nodeOutput";
import { useSelectionStore } from "@/store/selection";
import { useWorkflowStore } from "@/store/workflow/workflow";

import ValidationInfo from "./ValidationInfo.vue";
import type { ValidationError } from "./common/types";
import { EMBEDDED_CONTENT_PANEL_ID__BOTTOM } from "./common/utils";
import NodeOutputPane from "./NodeOutputPane.vue";

/**
 * Node output panel — coordinates which nodes to display and delegates
 * per-node port tab + output rendering to NodeOutputPane.
 *
 * Supports split view: shows up to 2 selected nodes side-by-side, each with
 * its own flat port tab bar. Single node = full-width.
 */

const { activeProjectId: projectId, availablePortTypes } = storeToRefs(
  useApplicationStore(),
);
const { activeWorkflow } = storeToRefs(useWorkflowStore());
const workflowId = computed(() => activeWorkflow.value!.info.containerId);
const versionId = computed(() => activeWorkflow.value!.info.version);

const { querySelection } = useSelectionStore();
const { getSelectedNodes: selectedNodes } = querySelection("committed");

const { activePortTab } = storeToRefs(useNodeOutputStore());

// Cap at 2 nodes for split view
const displayedNodes = computed(() => selectedNodes.value.slice(0, 2));
const isSplit = computed(() => displayedNodes.value.length > 1);

const noNodeError: ValidationError = {
  type: "NODE",
  code: "NO_NODE_SELECTED",
  message: "Select a configured or executed node to show the node output.",
};
</script>

<template>
  <div class="output-container">
    <!-- No nodes selected -->
    <div v-if="!selectedNodes.length" class="no-selection">
      <ValidationInfo
        :validation-error="noNodeError"
        :selected-node="null"
        :selected-port-index="null"
      />
    </div>

    <!-- One or two nodes: render pane(s) -->
    <div v-else class="panes" :class="{ split: isSplit }">
      <!-- Primary pane: synced to store's activePortTab for keyboard shortcut compatibility -->
      <NodeOutputPane
        :node="displayedNodes[0]"
        :project-id="projectId!"
        :workflow-id="workflowId"
        :version-id="versionId"
        :available-port-types="availablePortTypes"
        :model-value="activePortTab"
        :panel-id="EMBEDDED_CONTENT_PANEL_ID__BOTTOM"
        :is-in-split-view="isSplit"
        @update:model-value="activePortTab = $event"
      />

      <!-- Secondary pane (split view only): fully independent local state -->
      <NodeOutputPane
        v-if="isSplit"
        :node="displayedNodes[1]"
        :project-id="projectId!"
        :workflow-id="workflowId"
        :version-id="versionId"
        :available-port-types="availablePortTypes"
        :is-in-split-view="true"
      />
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.output-container {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 10px 10px 0;

  & .no-selection {
    flex: 1;
    overflow: auto;
  }

  & .panes {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;

    &.split {
      flex-direction: row;
      gap: 1px;
      background-color: var(--knime-silver-sand);

      & > * {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        background-color: var(--knime-white);
      }
    }
  }
}
</style>
