<script setup lang="ts">
import { computed } from "vue";

import { KdsButton } from "@knime/kds-components";
import type { APILayerDirtyState } from "@knime/ui-extension-renderer/api";

import {
  type ComponentNode,
  type NativeNode,
  NodeState,
} from "@/api/gateway-api/generated-api";

type Props = {
  dirtyState: APILayerDirtyState;
  activeNode: NativeNode | ComponentNode;
};

const props = defineProps<Props>();

const emit = defineEmits<{
  apply: [execute: boolean];
  execute: [];
  discard: [];
}>();

const nodeState = computed(() => props.activeNode.state?.executionState);

const showExecuteOnlyButton = computed(
  () =>
    nodeState.value === NodeState.ExecutionStateEnum.CONFIGURED &&
    props.dirtyState.apply === "clean",
);

const canApplyOrDiscard = computed(() => {
  return props.dirtyState.apply !== "clean";
});

const canApplyAndExecute = computed(() => {
  switch (nodeState.value) {
    case NodeState.ExecutionStateEnum.IDLE:
    case NodeState.ExecutionStateEnum.CONFIGURED: {
      return props.dirtyState.apply !== "clean";
    }

    case NodeState.ExecutionStateEnum.EXECUTED: {
      return props.dirtyState.apply === "configured";
    }

    default: {
      return false;
    }
  }
});
</script>

<template>
  <div ref="buttons" class="buttons">
    <KdsButton
      class="button discard"
      label="Discard"
      variant="transparent"
      :disabled="!canApplyOrDiscard"
      @click="emit('discard')"
    />

    <KdsButton
      v-if="!showExecuteOnlyButton"
      class="button apply-execute"
      :disabled="!canApplyAndExecute"
      label="Apply and Execute"
      variant="outlined"
      @click="emit('apply', true)"
    />

    <KdsButton
      v-if="showExecuteOnlyButton"
      class="button execute"
      label="Execute"
      variant="outlined"
      @click="emit('execute')"
    />

    <KdsButton
      class="button apply"
      :disabled="!canApplyOrDiscard"
      label="Apply"
      variant="filled"
      @click="emit('apply', false)"
    />
  </div>
</template>

<style lang="postcss" scoped>
& .buttons {
  border-top: var(--kds-border-base-muted);
  display: flex;
  padding: var(--kds-spacing-container-0-5x);
  gap: var(--kds-spacing-container-0-5x);
  justify-content: space-between;
  margin-top: auto;

  & .apply-execute,
  & .execute {
    margin-left: auto;
  }
}
</style>
