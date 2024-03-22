<script setup lang="ts">
import { computed, ref } from "vue";

import { ApplyState } from "@knime/ui-extension-service";
import Button from "webapps-common/ui/components/Button.vue";

import { useStore } from "@/composables/useStore";
import type { UIExtensionLoadingState } from "../common/types";
import NodeDialogLoader from "./NodeDialogLoader.vue";
import { type NativeNode, NodeState } from "@/api/gateway-api/generated-api";
import { useNodeViewUniqueId } from "../common/useNodeViewUniqueId";
import { useNodeDialogInteraction } from "../common/useNodeDialogInteraction";

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

const { uniqueId } = useNodeViewUniqueId({
  projectId,
  workflowId,
  selectedNode,
});

const { dirtyState, applySettings } = useNodeDialogInteraction(uniqueId.value);

const canApplyOrDiscard = computed(() => {
  return dirtyState.value.payload.apply !== ApplyState.CLEAN;
});

const canApplyAndExecute = computed(() => {
  switch (nodeState.value) {
    case NodeState.ExecutionStateEnum.IDLE:
    case NodeState.ExecutionStateEnum.CONFIGURED: {
      return dirtyState.value.payload.apply !== ApplyState.CLEAN;
    }

    case NodeState.ExecutionStateEnum.EXECUTED: {
      return dirtyState.value.payload.apply === ApplyState.CONFIG;
    }

    default: {
      return false;
    }
  }
});
</script>

<template>
  <div class="wrapper">
    <NodeDialogLoader
      :project-id="projectId!"
      :workflow-id="workflowId"
      :selected-node="selectedNode"
      @loading-state-change="loadingState = $event"
    />

    <div v-if="loadingState?.value === 'ready'" class="buttons">
      <Button with-border compact :disabled="!canApplyOrDiscard">
        <strong>Discard</strong>
      </Button>

      <Button
        with-border
        compact
        class="apply-execute"
        :disabled="!canApplyAndExecute"
        @click="applySettings(selectedNode.id, true)"
      >
        <strong>Apply and Execute</strong>
      </Button>

      <Button
        primary
        compact
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

    & .apply-execute {
      margin-left: auto;
    }
  }
}
</style>
