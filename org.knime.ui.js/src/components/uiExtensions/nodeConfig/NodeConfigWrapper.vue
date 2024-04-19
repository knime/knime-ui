<script setup lang="ts">
import { computed, watch } from "vue";
import { ApplyState } from "@knime/ui-extension-service";

import { API } from "@api";
import type { KnimeNode } from "@/api/custom-types";
import { type NativeNode, NodeState } from "@/api/gateway-api/generated-api";
import { useStore } from "@/composables/useStore";
import { useConfirmModal } from "@/composables/useConfirmDialog";
import { isNativeNode } from "@/util/nodeUtil";
import { getToastsProvider } from "@/plugins/toasts";
import { runInEnvironment } from "@/environment";

import { useNodeConfigAPI } from "../common/useNodeConfigAPI";
import NodeConfigLayout from "./NodeConfigLayout.vue";
import AppRightPanelSkeleton from "@/components/application/AppRightPanelSkeleton.vue";

const store = useStore();

const $toast = getToastsProvider();

const projectId = computed(() => store.state.application.activeProjectId!);
const workflowId = computed(
  () => store.state.workflow.activeWorkflow!.info.containerId,
);
const selectedNode = computed<KnimeNode | null>(
  () => store.getters["selection/singleSelectedNode"],
);
const askToConfirmNodeConfigChanges = computed(
  () => store.state.application.askToConfirmNodeConfigChanges,
);

const { activeNodeId, applySettings, dirtyState } = useNodeConfigAPI();

const canConfigureNodes = computed(
  () => store.state.application.permissions.canConfigureNodes,
);

const { show: showConfirmModal } = useConfirmModal();

const promptApplyConfirmation = async () => {
  const prompt = () =>
    showConfirmModal({
      title: "Unsaved configuration changes",
      message:
        "You have unsaved changes in your node configuration. Do you want to apply them?",
      dontAskAgainText:
        "Always apply and don't ask again. (You can still change this in the preferences)",

      buttons: [
        {
          type: "cancel",
          label: "Cancel",
        },
        {
          type: "confirm",
          label: "Apply",
          flushRight: true,
        },
      ],
    });

  const { confirmed, dontAskAgain } = askToConfirmNodeConfigChanges.value
    ? await prompt()
    : { confirmed: true, dontAskAgain: true };

  // box was checked and setting is set to "ask"
  if (dontAskAgain && askToConfirmNodeConfigChanges.value) {
    await API.desktop.setConfirmNodeConfigChangesPreference(false);
  }

  return confirmed;
};

const applySettingsForNode = (node: NativeNode) => {
  const isExecuting =
    node.state?.executionState === NodeState.ExecutionStateEnum.EXECUTING ||
    node.state?.executionState === NodeState.ExecutionStateEnum.QUEUED;

  if (
    dirtyState.value.apply === ApplyState.CONFIG &&
    (!node.allowedActions?.canReset || isExecuting)
  ) {
    $toast.show({
      type: "warning",
      headline: "Node configuration was not saved",
      message:
        "The changes on the node configuration were not saved automatically. Apply manually the changes or reset the node.",
    });

    return;
  }

  applySettings(node.id);
};

const activeNode = computed(() => {
  if (!activeNodeId.value) {
    return null;
  }

  const node = store.state.workflow.activeWorkflow?.nodes[activeNodeId.value];

  return node && isNativeNode(node) && node.hasDialog ? node : null;
});

const setActiveNodeId = (nextNode: KnimeNode | null) => {
  // set the active node to be the next selected node
  activeNodeId.value = nextNode?.id ?? null;
};

watch(selectedNode, async (nextNode, prevNode) => {
  // skip selection to already active node
  // e.g when re-selecting after cancelling the prompt
  if (activeNodeId?.value === nextNode?.id) {
    return;
  }

  if (dirtyState.value.apply === ApplyState.CLEAN) {
    setActiveNodeId(nextNode);
    return;
  }

  if (!prevNode) {
    return;
  }

  await runInEnvironment({
    DESKTOP: async () => {
      const shouldApply = await promptApplyConfirmation();

      // if user cancelled then keep the re-select the same node
      if (!shouldApply) {
        store.dispatch("selection/deselectAllObjects");
        store.dispatch("selection/selectNode", prevNode!.id);
        return;
      }

      // We can make the assumption that `prevNode` is a NativeNode because:
      // -if there is a dirty state it means there's an embedded config, which is only available for NativeNodes
      applySettingsForNode(prevNode as NativeNode);
      setActiveNodeId(nextNode);
    },

    BROWSER: () => {
      applySettingsForNode(activeNode.value!);
      setActiveNodeId(nextNode);
    },
  });
});

const executeActiveNode = () => {
  store.dispatch("workflow/executeNodes", [activeNode.value!.id]);
};

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
      :can-configure="canConfigureNodes"
      @apply="applySettings(activeNode.id, $event)"
      @execute="executeActiveNode"
    >
      <template #loading-skeleton>
        <AppRightPanelSkeleton :width="rightPanelWidth" />
      </template>
    </NodeConfigLayout>
    <slot v-if="!activeNode" name="inactive" />
  </div>
</template>
