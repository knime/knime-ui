<script setup lang="ts">
import { computed, ref, watch } from "vue";

import { ApplyState } from "@knime/ui-extension-service";
import Button from "webapps-common/ui/components/Button.vue";

import { type NativeNode, NodeState } from "@/api/gateway-api/generated-api";
import { useStore } from "@/composables/useStore";
import { useConfirmModal } from "@/composables/useConfirmDialog";
import AppRightPanelSkeleton from "@/components/application/AppRightPanelSkeleton.vue";
import { getToastsProvider } from "@/plugins/toasts";
import { isNodeExecuting } from "@/util/nodeUtil";
import { runInEnvironment } from "@/environment";

import type { UIExtensionLoadingState } from "../common/types";
import { useNodeConfigAPI } from "../common/useNodeConfigAPI";
import NodeConfigLoader from "./NodeConfigLoader.vue";

const store = useStore();

const loadingState = ref<UIExtensionLoadingState | null>(null);

// Computed properties
const projectId = computed(() => store.state.application.activeProjectId!);
const workflowId = computed(
  () => store.state.workflow.activeWorkflow!.info.containerId,
);
const selectedNode = computed<NativeNode | null>(
  () => store.getters["selection/singleSelectedNode"],
);
const permissions = computed(() => store.state.application.permissions);
const askBeforeAutoApplyNodeConfigChanges = computed(
  () => store.state.settings.settings.askBeforeAutoApplyNodeConfigChanges,
);

const isSelectedNodeExecuting = computed(
  () => selectedNode.value && isNodeExecuting(selectedNode.value),
);

const isDisabled = computed(
  () => isSelectedNodeExecuting.value || !permissions.value.canConfigureNodes,
);

const nodeState = computed(() => selectedNode.value?.state?.executionState);

const { dirtyState, applySettings, discardSettings } = useNodeConfigAPI();

const $toast = getToastsProvider();

const isLoadingReady = computed(() => loadingState.value?.value === "ready");

const showExecuteOnlyButton = computed(
  () =>
    nodeState.value === NodeState.ExecutionStateEnum.CONFIGURED &&
    dirtyState.value.apply === ApplyState.CLEAN,
);

const canApplyOrDiscard = computed(() => {
  return dirtyState.value.apply !== ApplyState.CLEAN;
});

const canApplyAndExecute = computed(() => {
  switch (nodeState.value) {
    case NodeState.ExecutionStateEnum.IDLE:
    case NodeState.ExecutionStateEnum.CONFIGURED: {
      return dirtyState.value.apply !== ApplyState.CLEAN;
    }

    case NodeState.ExecutionStateEnum.EXECUTED: {
      return dirtyState.value.apply === ApplyState.CONFIG;
    }

    default: {
      return false;
    }
  }
});

const mountKey = ref(0);

const executeNode = () => {
  store.dispatch("workflow/executeNodes", [selectedNode.value!.id]);
};

const onDiscard = () => {
  // Currently there's no way to discard the node dialog internal state
  // via the ui-extension service. So we just re-mount the component to force a clear
  mountKey.value++;

  // we also need to reset the value of the dirtyState reactive property
  discardSettings();
};

const { show: showConfirmModal, isActive: isConfirmModalActive } =
  useConfirmModal();

const applySettingsForNode = (node: NativeNode) => {
  if (!canApplyOrDiscard.value) {
    return;
  }

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

const applySettingsWithConfirmation = async (node: NativeNode) => {
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

  if (confirmed) {
    applySettings(node.id);
  }

  // box was checked and setting was set to "ask"
  if (dontAskAgain && askBeforeAutoApplyNodeConfigChanges.value) {
    store.dispatch("settings/updateSetting", {
      key: "askBeforeAutoApplyNodeConfigChanges",
      value: false,
    });
  }
};

watch(selectedNode, (nextNode, prevNode) => {
  if (!canApplyOrDiscard.value || !prevNode) {
    return;
  }

  runInEnvironment({
    DESKTOP: () => applySettingsWithConfirmation(prevNode),

    BROWSER: () => applySettingsForNode(prevNode),
  });
});

const rightPanelWidth = computed(
  () => store.state.settings.settings.nodeDialogSize,
);
</script>

<template>
  <AppRightPanelSkeleton v-if="isConfirmModalActive" :width="rightPanelWidth" />

  <div
    v-if="selectedNode && !isConfirmModalActive"
    class="wrapper"
    :aria-disabled="isDisabled"
  >
    <NodeConfigLoader
      :key="mountKey"
      :project-id="projectId!"
      :workflow-id="workflowId"
      :selected-node="selectedNode"
      @loading-state-change="loadingState = $event"
    >
      <template #controls>
        <div v-if="isLoadingReady" ref="buttons" class="buttons">
          <Button
            with-border
            compact
            class="button discard"
            :disabled="!canApplyOrDiscard"
            @click="onDiscard"
          >
            <strong>Discard</strong>
          </Button>

          <Button
            v-if="!showExecuteOnlyButton"
            with-border
            compact
            class="button apply-execute"
            :disabled="!canApplyAndExecute"
            @click="applySettings(selectedNode.id, true)"
          >
            <strong>Apply and Execute</strong>
          </Button>

          <Button
            v-if="showExecuteOnlyButton"
            with-border
            compact
            class="button execute"
            @click="executeNode"
          >
            <strong>Execute</strong>
          </Button>

          <Button
            primary
            compact
            class="button apply"
            :disabled="!canApplyOrDiscard"
            @click="applySettings(selectedNode.id, false)"
          >
            <strong>Apply</strong>
          </Button>
        </div>
      </template>
    </NodeConfigLoader>
  </div>
</template>

<style lang="postcss" scoped>
.wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;

  & .buttons {
    border-top: 1px solid var(--knime-silver-sand);
    display: flex;
    padding: 10px 20px;
    gap: 10px;
    justify-content: space-between;
    margin-top: auto;

    & .apply-execute,
    & .execute {
      margin-left: auto;
    }
  }

  &[aria-disabled="true"] {
    pointer-events: none;
    opacity: 0.7;

    /* TODO conflicts with ptr evt none */

    /* cursor: not-allowed; */
    transition: opacity 150ms ease-out;
    user-select: none;
  }
}
</style>
