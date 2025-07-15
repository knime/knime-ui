<script setup lang="ts">
import { computed } from "vue";

import { Button } from "@knime/components";
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
    <Button
      with-border
      compact
      class="button discard"
      :disabled="!canApplyOrDiscard"
      @click="emit('discard')"
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

<style lang="postcss" scoped>
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
</style>
