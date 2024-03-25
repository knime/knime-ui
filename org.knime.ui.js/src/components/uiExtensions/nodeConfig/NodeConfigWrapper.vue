<script setup lang="ts">
import { computed, ref } from "vue";

import { ApplyState } from "@knime/ui-extension-service";
import Button from "webapps-common/ui/components/Button.vue";

import { useStore } from "@/composables/useStore";
import { type NativeNode, NodeState } from "@/api/gateway-api/generated-api";
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

const nodeState = computed(() => selectedNode.value.state!.executionState!);

const { dirtyState, applySettings, discardSettings } = useNodeConfigAPI();

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

    & .apply-execute,
    & .execute {
      margin-left: auto;
    }
  }
}
</style>
