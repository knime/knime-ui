<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";

import { ApplyState, ViewState } from "@knime/ui-extension-service";
import Button from "webapps-common/ui/components/Button.vue";

import { useStore } from "@/composables/useStore";
import { isBrowser } from "@/environment";
import { type NativeNode, NodeState } from "@/api/gateway-api/generated-api";
import { getToastsProvider } from "@/plugins/toasts";
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
const selectedNode = computed<NativeNode>(
  () => store.getters["selection/singleSelectedNode"],
);
const permissions = computed(() => store.state.application.permissions);

const nodeState = computed(() => selectedNode.value.state!.executionState!);

const { dirtyState, applySettings, discardSettings } = useNodeConfigAPI();

const $toast = getToastsProvider();

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

const applySettingsOnSelectionChange = (node: NativeNode) => {
  if (
    !permissions.value.canConfigureNodes ||
    (dirtyState.value.apply === ApplyState.CLEAN &&
      dirtyState.value.view === ViewState.CLEAN)
  ) {
    return;
  }

  if (
    dirtyState.value.apply === ApplyState.CONFIG &&
    (node.state?.executionState === NodeState.ExecutionStateEnum.EXECUTED ||
      node.state?.executionState === NodeState.ExecutionStateEnum.EXECUTING ||
      node.state?.executionState === NodeState.ExecutionStateEnum.QUEUED)
  ) {
    // TODO NXT-2522 Add here a check of user preferences and/or show a proper dialog that set that preference
    $toast.show({
      type: "warning",
      headline: "Node configuration was not saved",
      message:
        "The changes on the node configuration were not saved automatically. Apply manually the changes or reset the node.",
    });
    return;
  }

  if (canApplyOrDiscard.value) {
    applySettings(node.id, false);
  }
};

let lastSelectedNode = selectedNode.value;

watch(selectedNode, (nextNode, prevNode) => {
  if (isBrowser) {
    applySettingsOnSelectionChange(prevNode);
    lastSelectedNode = nextNode;
  }
});

onBeforeUnmount(() => {
  if (isBrowser) {
    applySettingsOnSelectionChange(lastSelectedNode);
  }
});

const mountKey = ref(0);

const executeNode = () => {
  store.dispatch("workflow/executeNodes", [selectedNode.value.id]);
};

const onDiscard = () => {
  // Currently there's no way to discard the node dialog internal state
  // via the ui-extension service. So we just re-mount the component to force a clear
  mountKey.value++;

  // we also need to reset the value of the dirtyState reactive property
  discardSettings();
};
</script>

<template>
  <div class="wrapper">
    <NodeConfigLoader
      :key="mountKey"
      :project-id="projectId!"
      :workflow-id="workflowId"
      :selected-node="selectedNode"
      @loading-state-change="loadingState = $event"
    />

    <div v-if="loadingState?.value === 'ready'" ref="buttons" class="buttons">
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
}
</style>
