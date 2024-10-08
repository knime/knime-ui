<script setup lang="ts">
import { computed, watch } from "vue";

import { ApplyState } from "@knime/ui-extension-service";

import type { KnimeNode } from "@/api/custom-types";
import { type NativeNode } from "@/api/gateway-api/generated-api";
import AppRightPanelSkeleton from "@/components/application/AppSkeletonLoader/AppRightPanelSkeleton.vue";
import { useStore } from "@/composables/useStore";

import NodeConfigLayout from "./NodeConfigLayout.vue";

const store = useStore();

const projectId = computed(() => store.state.application.activeProjectId!);
const workflowId = computed(
  () => store.state.workflow.activeWorkflow!.info.containerId,
);
const selectedNode = computed<KnimeNode | null>(
  () => store.getters["selection/singleSelectedNode"],
);

const activeNodeId = computed(() => store.state.nodeConfiguration.activeNodeId);
const dirtyState = computed(() => store.state.nodeConfiguration.dirtyState);
const activeNode = computed<NativeNode | null>(
  () => store.getters["nodeConfiguration/activeNode"],
);

const isConfigurationDisabled = computed<boolean>(
  () => store.getters["nodeConfiguration/isConfigurationDisabled"],
);

const applySettings = (nodeId: string, execute?: boolean) => {
  store.dispatch("nodeConfiguration/applySettings", { nodeId, execute });
};

const discardSettings = () => {
  store.dispatch("nodeConfiguration/discardSettings");
};

const executeActiveNode = () => {
  store.dispatch("workflow/executeNodes", [activeNode.value!.id]);
};

watch(selectedNode, async (nextNode) => {
  // skip selection of already active node
  // e.g when re-selecting same node after cancelling the auto-apply prompt
  if (activeNodeId?.value === nextNode?.id) {
    return;
  }

  if (
    dirtyState.value.apply === ApplyState.CLEAN ||
    isConfigurationDisabled.value
  ) {
    // set the active node to be the next selected node
    store.commit("nodeConfiguration/setActiveNodeId", nextNode?.id ?? null);
    return;
  }

  // if the configuration state is dirty, attempt to auto apply the settings
  // before changing the active node
  await store.dispatch("nodeConfiguration/autoApplySettings", { nextNode });
});

const rightPanelWidth = computed(
  () => store.state.settings.settings.nodeDialogSize,
);
</script>

<template>
  <div>
    <NodeConfigLayout
      v-if="activeNode"
      :active-node="activeNode"
      :project-id="projectId"
      :workflow-id="workflowId"
      :disabled="isConfigurationDisabled"
      :dirty-state="dirtyState"
      @apply="applySettings(activeNode.id, $event)"
      @execute="executeActiveNode"
      @discard="discardSettings"
    >
      <template #loading-skeleton>
        <AppRightPanelSkeleton :width="rightPanelWidth" />
      </template>
    </NodeConfigLayout>
    <slot v-if="!activeNode" name="inactive" />
  </div>
</template>
