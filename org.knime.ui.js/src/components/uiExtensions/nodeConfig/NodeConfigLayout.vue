<script setup lang="ts">
import { computed, ref } from "vue";

import { Button, FunctionButton } from "@knime/components";
import ArrowsExpandIcon from "@knime/styles/img/icons/arrows-expand.svg";
import { type APILayerDirtyState } from "@knime/ui-extension-renderer/api";

import { type NativeNode, NodeState } from "@/api/gateway-api/generated-api";
import type { UIExtensionLoadingState } from "../common/types";

import NodeConfigLoader from "./NodeConfigLoader.vue";

type Props = {
  activeNode: NativeNode;
  projectId: string;
  workflowId: string;
  versionId?: string;
  disabled: boolean;
  dirtyState: APILayerDirtyState;
  nodeName: string;
  canBeEnlarged: boolean;
  isLargeMode: boolean;
};

const props = defineProps<Props>();

const emit = defineEmits<{
  apply: [execute: boolean];
  execute: [];
  discard: [];
  expand: [];
}>();

const loadingState = ref<UIExtensionLoadingState | null>(null);

const nodeState = computed(() => props.activeNode.state?.executionState);

const isLoadingReady = computed(() => loadingState.value?.value === "ready");

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

const mountKey = ref(0);

const onDiscard = () => {
  // Currently there's no way to discard the node dialog internal state
  // via the ui-extension service. So we just re-mount the component to force a clear
  mountKey.value++;

  emit("discard");
};
</script>

<template>
  <slot v-if="loadingState?.value === 'loading'" name="loading-skeleton" />
  <div v-show="isLoadingReady" class="wrapper" :aria-disabled="disabled">
    <NodeConfigLoader
      :key="mountKey"
      :project-id="projectId!"
      :workflow-id="workflowId"
      :version-id="versionId"
      :selected-node="activeNode"
      @loading-state-change="loadingState = $event"
    >
      <template #header>
        <div v-if="!isLargeMode" class="header">
          <h6>{{ nodeName }}</h6>
          <FunctionButton v-if="canBeEnlarged" @click="emit('expand')">
            <ArrowsExpandIcon />
          </FunctionButton>
        </div>
      </template>
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

  & .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-8) var(--space-16) 5px;
    border-bottom: 1px solid var(--knime-silver-sand);

    & h6 {
      margin: 0;
      font-weight: 400;
      font-size: 18px;
      line-height: 36px;
    }
  }

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
