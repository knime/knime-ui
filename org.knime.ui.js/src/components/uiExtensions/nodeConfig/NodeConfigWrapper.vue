<script setup lang="ts">
import { computed, watch } from "vue";

import type { KnimeNode } from "@/api/custom-types";
import { useStore } from "@/composables/useStore";
import { useNodeConfigAPI } from "../common/useNodeConfigAPI";
import { useConfirmModal } from "@/composables/useConfirmDialog";
import NodeConfigLayout from "./NodeConfigLayout.vue";
import { ApplyState } from "@knime/ui-extension-service";
import { isNativeNode } from "@/util/nodeUtil";

const store = useStore();

const projectId = computed(() => store.state.application.activeProjectId!);
const workflowId = computed(
  () => store.state.workflow.activeWorkflow!.info.containerId,
);
const selectedNode = computed<KnimeNode | null>(
  () => store.getters["selection/singleSelectedNode"],
);
const askBeforeAutoApplyNodeConfigChanges = computed(
  () => store.state.settings.settings.askBeforeAutoApplyNodeConfigChanges,
);

const { activeNodeId, applySettings, dirtyState, resetDirtyState } =
  useNodeConfigAPI();

const { isActive: isConfirmModalActive, show: showConfirmModal } =
  useConfirmModal();

// const lastSelectedNodeId = ref<string | null>(null);

const promptApplyConfirmation = async () => {
  const prompt = () =>
    showConfirmModal({
      title: "Apply node configuration changes",
      message: "Do you want to apply your changes?",
      dontAskAgainText:
        "Do not ask again (You can revert this decision in the preferences)",

      cancelButtonText: "No",
      confirmButtonText: "Yes, apply",
    });

  const { confirmed, dontAskAgain } = askBeforeAutoApplyNodeConfigChanges.value
    ? await prompt()
    : { confirmed: true, dontAskAgain: true };

  // box was checked and setting was set to "ask"
  if (dontAskAgain && askBeforeAutoApplyNodeConfigChanges.value) {
    store.dispatch("settings/updateSetting", {
      key: "askBeforeAutoApplyNodeConfigChanges",
      value: false,
    });
  }

  return confirmed;
};

const activeNode = computed(() => {
  if (!activeNodeId.value) {
    return null;
  }

  const node = store.state.workflow.activeWorkflow?.nodes[activeNodeId.value];

  return node && isNativeNode(node) && node.hasDialog ? node : null;
});

watch(selectedNode, async (nextNode, prevNode) => {
  const setActiveNodeId = () => {
    activeNodeId.value = nextNode?.id ?? null;
  };

  // skip selection to already active node
  if (activeNodeId?.value === nextNode?.id) {
    return;
  }

  if (dirtyState.value.apply !== ApplyState.CLEAN) {
    const shouldApply = await promptApplyConfirmation();

    // if user cancelled then keep the selection on the same node
    if (!shouldApply) {
      store.dispatch("selection/deselectAllObjects");
      store.dispatch("selection/selectNode", prevNode!.id);
      return;
    }

    applySettings(prevNode!.id);
  }

  // set the active node to be the next selected native node
  setActiveNodeId();
});
</script>

<template>
  <div>
    <NodeConfigLayout
      v-if="activeNode"
      :active-node="activeNode"
      :project-id="projectId"
      :workflow-id="workflowId"
    />
    <slot v-if="!activeNode" name="inactive" />
  </div>
</template>

<style lang="postcss" scoped></style>
