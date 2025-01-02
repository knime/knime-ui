<script setup lang="ts">
import { computed, watch } from "vue";
import { storeToRefs } from "pinia";

import AppRightPanelSkeleton from "@/components/application/AppSkeletonLoader/AppRightPanelSkeleton.vue";
import { useApplicationStore } from "@/store/application/application";
import { useNodeConfigurationStore } from "@/store/nodeConfiguration/nodeConfiguration";
import { useSelectionStore } from "@/store/selection";
import { useSettingsStore } from "@/store/settings";
import { useExecutionStore } from "@/store/workflow/execution";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";

import NodeConfigLayout from "./NodeConfigLayout.vue";

type Props = {
  isLargeMode: boolean;
};

const props = defineProps<Props>();
const emit = defineEmits<{
  expand: [];
}>();

const { activeProjectId: projectId } = storeToRefs(useApplicationStore());
const { activeWorkflow } = storeToRefs(useWorkflowStore());
const { singleSelectedNode: selectedNode } = storeToRefs(useSelectionStore());
const nodeConfigurationStore = useNodeConfigurationStore();
const {
  activeExtensionConfig,
  activeNodeId,
  dirtyState,
  activeNode,
  isConfigurationDisabled,
} = storeToRefs(nodeConfigurationStore);

const workflowId = computed(() => activeWorkflow.value!.info.containerId);
const canBeEnlarged = computed(
  () => activeExtensionConfig.value?.canBeEnlarged ?? false,
);

const nodeName = computed<string>(() =>
  activeNodeId.value
    ? useNodeInteractionsStore().getNodeName(activeNodeId.value)
    : "",
);

const applySettings = (nodeId: string, execute?: boolean) => {
  nodeConfigurationStore.applySettings({ nodeId, execute });
};

const discardSettings = () => {
  nodeConfigurationStore.discardSettings();
};

const executeActiveNode = () => {
  useExecutionStore().executeNodes([activeNode.value!.id]);
};

watch(
  selectedNode,
  async (nextNode) => {
    // skip selection of already active node
    // e.g when re-selecting same node after cancelling the auto-apply prompt
    if (activeNodeId?.value === nextNode?.id) {
      return;
    }

    if (dirtyState.value.apply === "clean" || isConfigurationDisabled.value) {
      // set the active node to be the next selected node
      nodeConfigurationStore.setActiveNodeId(nextNode?.id ?? null);
      return;
    }

    // if the configuration state is dirty, attempt to auto apply the settings
    // before changing the active node
    await nodeConfigurationStore.autoApplySettings({
      nextNodeId: nextNode?.id ?? null,
    });
  },
  {
    immediate: true,
  },
);

const { settings } = storeToRefs(useSettingsStore());

const rightPanelWidth = computed(() => settings.value.nodeDialogSize);
</script>

<template>
  <div>
    <NodeConfigLayout
      v-if="activeNode"
      :active-node="activeNode"
      :project-id="projectId!"
      :workflow-id="workflowId"
      :disabled="isConfigurationDisabled"
      :dirty-state="dirtyState"
      :is-large-mode="props.isLargeMode"
      :can-be-enlarged="canBeEnlarged"
      :node-name="nodeName"
      @apply="applySettings(activeNode.id, $event)"
      @execute="executeActiveNode"
      @discard="discardSettings"
      @expand="emit('expand')"
    >
      <template #loading-skeleton>
        <AppRightPanelSkeleton :width="rightPanelWidth" />
      </template>
    </NodeConfigLayout>
    <slot v-if="!activeNode" name="inactive" />
  </div>
</template>
