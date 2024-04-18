<script setup lang="ts">
import { computed, ref } from "vue";

import { ApplyState } from "@knime/ui-extension-service";
import Button from "webapps-common/ui/components/Button.vue";

import { type NativeNode, NodeState } from "@/api/gateway-api/generated-api";
import { useStore } from "@/composables/useStore";
import { isNodeExecuting } from "@/util/nodeUtil";

import type { UIExtensionLoadingState } from "../common/types";
import { useNodeConfigAPI } from "../common/useNodeConfigAPI";
import NodeConfigLoader from "./NodeConfigLoader.vue";

type Props = {
  activeNode: NativeNode;
  projectId: string;
  workflowId: string;
};

const props = defineProps<Props>();

const emit = defineEmits<{
  apply: [execute: boolean];
  execute: [];
  discard: [];
}>();

const store = useStore();

const loadingState = ref<UIExtensionLoadingState | null>(null);

// Computed properties
const permissions = computed(() => store.state.application.permissions);

const isSelectedNodeExecuting = computed(() =>
  isNodeExecuting(props.activeNode),
);

const isDisabled = computed(
  () => isSelectedNodeExecuting.value || !permissions.value.canConfigureNodes,
);

const nodeState = computed(() => props.activeNode.state?.executionState);

const { dirtyState } = useNodeConfigAPI();

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

const onDiscard = () => {
  // Currently there's no way to discard the node dialog internal state
  // via the ui-extension service. So we just re-mount the component to force a clear
  mountKey.value++;

  emit("discard");
};
</script>

<template>
  <div class="wrapper" :aria-disabled="isDisabled">
    <NodeConfigLoader
      :key="mountKey"
      :project-id="projectId!"
      :workflow-id="workflowId"
      :selected-node="activeNode"
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
            @click="emit('apply', true)"
          >
            <strong>Apply and Execute</strong>
          </Button>

          <Button
            v-if="showExecuteOnlyButton"
            with-border
            compact
            class="button execute"
            @click="emit('execute')"
          >
            <strong>Execute</strong>
          </Button>

          <Button
            primary
            compact
            class="button apply"
            :disabled="!canApplyOrDiscard"
            @click="emit('apply', false)"
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
