<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import AppRightPanelSkeleton from "@/components/application/AppSkeletonLoader/AppRightPanelSkeleton.vue";
import { useApplicationStore } from "@/store/application/application";
import { useNodeConfigurationStore } from "@/store/nodeConfiguration/nodeConfiguration";
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
const nodeConfigurationStore = useNodeConfigurationStore();
const {
  activeExtensionConfig,
  dirtyState,
  activeNode,
  isConfigurationDisabled,
} = storeToRefs(nodeConfigurationStore);

const workflowId = computed(() => activeWorkflow.value!.info.containerId);
const versionId = computed(() => activeWorkflow.value!.info.version);
const canBeEnlarged = computed(
  () => activeExtensionConfig.value?.canBeEnlarged ?? false,
);

const nodeName = computed<string>(() =>
  activeNode.value
    ? useNodeInteractionsStore().getNodeName(activeNode.value.id)
    : "",
);

const applySettings = (nodeId: string, execute?: boolean) => {
  nodeConfigurationStore.applySettings({ nodeId, execute });
};

const discardSettings = () => {
  nodeConfigurationStore.discardSettings();
};

const executeActiveNode = async () => {
  await useExecutionStore().executeNodes([activeNode.value!.id]);
};

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
      :version-id="versionId"
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
