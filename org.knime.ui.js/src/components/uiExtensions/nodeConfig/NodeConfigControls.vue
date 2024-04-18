<script setup lang="ts">
import type { NativeNode } from "@/api/gateway-api/generated-api";
import NodeState from "@/components/workflow/node/NodeState.vue";
import { ApplyState } from "@knime/ui-extension-service";
import { computed } from "vue";
import Button from "webapps-common/ui/components/Button.vue";
import { useNodeConfigAPI } from "../common/useNodeConfigAPI";

type Props = {
  activeNode: NativeNode;
};

const props = defineProps<Props>();

const { dirtyState, applySettings, discardSettings } = useNodeConfigAPI();

const nodeState = computed(() => props.activeNode.state?.executionState);

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

const executeNode = () => {
  // store.dispatch("workflow/executeNodes", [activeNode.value!.id]);
};

const onDiscard = () => {
  // // Currently there's no way to discard the node dialog internal state
  // // via the ui-extension service. So we just re-mount the component to force a clear
  // mountKey.value++;
  // // we also need to reset the value of the dirtyState reactive property
  // discardSettings();
};
</script>

<template>
  <div ref="buttons" class="buttons">
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
      @click="applySettings(activeNode.id, true)"
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
      @click="applySettings(activeNode.id, false)"
    >
      <strong>Apply</strong>
    </Button>
  </div>
</template>

<style lang="postcss" scoped>
.buttons {
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
