<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";

import { Button, FunctionButton } from "@knime/components";
import CloseIcon from "@knime/styles/img/icons/close.svg";
import MinimizeDialogIcon from "@knime/styles/img/icons/minimize-large-dialog.svg";
import OpenDialogIcon from "@knime/styles/img/icons/open-large-dialog.svg";

import AppRightPanelSkeleton from "@/components/application/AppSkeletonLoader/AppRightPanelSkeleton.vue";
import { useApplicationStore } from "@/store/application/application";
import { useNodeConfigurationStore } from "@/store/nodeConfiguration/nodeConfiguration";
import { usePanelStore } from "@/store/panel";
import { useSettingsStore } from "@/store/settings";
import { useExecutionStore } from "@/store/workflow/execution";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import type { UIExtensionLoadingState } from "../common/types";

import NodeConfigButtons from "./NodeConfigButtons.vue";
import NodeConfigLoader from "./NodeConfigLoader.vue";

const mountKey = ref(0);
const loadingState = ref<UIExtensionLoadingState | null>(null);
const areControlsVisible = ref(true);

const { activeProjectId: projectId } = storeToRefs(useApplicationStore());
const { activeWorkflow } = storeToRefs(useWorkflowStore());
const nodeConfigurationStore = useNodeConfigurationStore();
const {
  isLargeMode,
  activeExtensionConfig,
  dirtyState,
  activeContext,
  isConfigurationDisabled,
} = storeToRefs(nodeConfigurationStore);
const { settings } = storeToRefs(useSettingsStore());
const panelStore = usePanelStore();

const workflowId = computed(() => activeWorkflow.value!.info.containerId);
const versionId = computed(() => activeWorkflow.value!.info.version);
const canBeEnlarged = computed(
  () => activeExtensionConfig.value?.canBeEnlarged ?? false,
);

const nodeName = computed<string>(() =>
  activeContext.value
    ? useNodeInteractionsStore().getNodeName(activeContext.value.node.id)
    : "",
);

const rightPanelWidth = computed(() => settings.value.nodeDialogSize);

const isUIExtensionLoading = computed(
  () => loadingState.value?.value === "loading",
);
const isUIExtensionReady = computed(
  () => loadingState.value?.value === "ready",
);

const tryExitLargeMode = () => {
  if (isLargeMode.value) {
    nodeConfigurationStore.setIsLargeMode(false);
  }
};

const applySettings = async (nodeId: string, execute?: boolean) => {
  await nodeConfigurationStore.applySettings({
    nodeId,
    execute,
  });
  tryExitLargeMode();
};

const executeActiveNode = async () => {
  if (activeContext.value) {
    await useExecutionStore().executeNodes([activeContext.value.node.id]);
    tryExitLargeMode();
  }
};

const discardSettings = () => {
  // Currently there's no way to discard the node dialog internal state
  // via the ui-extension service. So we just re-mount the component to force a clear
  mountKey.value++;

  nodeConfigurationStore.discardSettings();
  tryExitLargeMode();
};
</script>

<template>
  <div class="node-configuration">
    <div v-if="isLargeMode" class="title-bar">
      <h1 class="node-name">{{ nodeName }}</h1>
      <Button
        v-if="activeContext && canBeEnlarged"
        on-dark
        compact
        class="minimize-btn"
        data-test-id="exit-large-mode"
        @click="tryExitLargeMode"
      >
        <MinimizeDialogIcon class="minimize-icon" />
        Minimize
      </Button>
    </div>

    <div :class="['content', { 'large-mode': isLargeMode }]">
      <div v-if="!isLargeMode" class="header">
        <h1 class="node-name">{{ nodeName }}</h1>
        <FunctionButton
          v-if="canBeEnlarged"
          title="Expand into a more advanced configuration view"
          data-test-id="expand-dialog-btn"
          class="expand-btn"
          compact
          @click="nodeConfigurationStore.setIsLargeMode(true)"
        >
          <OpenDialogIcon />
        </FunctionButton>

        <FunctionButton
          title="Close panel"
          data-test-id="close-panel-btn"
          class="close-btn"
          compact
          @click="panelStore.isRightPanelExpanded = false"
        >
          <CloseIcon />
        </FunctionButton>
      </div>

      <AppRightPanelSkeleton
        v-if="isUIExtensionLoading"
        :width="rightPanelWidth"
      />

      <template v-if="activeContext && activeContext.isEmbeddable">
        <NodeConfigLoader
          v-show="isUIExtensionReady"
          :key="mountKey"
          :aria-disabled="isConfigurationDisabled"
          :project-id="projectId!"
          :workflow-id="workflowId"
          :version-id="versionId"
          :selected-node="activeContext.node"
          @loading-state-change="loadingState = $event"
          @controls-visibility-change="areControlsVisible = $event"
        />
        <NodeConfigButtons
          v-if="areControlsVisible && isUIExtensionReady"
          :aria-disabled="isConfigurationDisabled"
          :dirty-state="dirtyState"
          :active-node="activeContext.node"
          @apply="applySettings(activeContext.node.id, $event)"
          @execute="executeActiveNode"
          @discard="discardSettings"
        />
      </template>

      <slot v-else name="inactive" />
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.node-configuration {
  --title-bar-height: var(--space-32);

  height: 100%;

  & .title-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: var(--knime-white);
    background-color: var(--knime-masala);
    max-width: 100%;
    padding: 0 var(--space-4) 0 var(--space-12);
    height: var(--title-bar-height);

    & .node-name {
      margin: 0;
      font-size: 18px;
      line-height: var(--title-bar-height);
    }

    & .minimize-btn {
      color: var(--knime-white);
      margin-bottom: 1px;
      padding: var(--space-4) var(--space-8);

      &:hover,
      &:focus {
        background-color: var(--knime-black-semi);
      }

      & .minimize-icon {
        stroke: var(--knime-white);
        margin-right: var(--space-4);
      }
    }
  }

  & .content {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;

    &.large-mode {
      height: calc(100% - var(--title-bar-height));
    }

    & .header {
      display: flex;
      align-items: center;
      padding: var(--space-4) var(--space-16);
      border-bottom: 1px solid var(--knime-silver-sand);
      min-height: var(--space-32);
      gap: var(--space-4);

      & .node-name {
        margin: 0;
        font-weight: 700;
        font-size: 16px;
        line-height: 1.44;
        margin-right: auto;
      }
    }
  }
}

/* TODO: UIEXT-2775 use a different approach */
[aria-disabled="true"] {
  pointer-events: none;
  opacity: 0.7;
  transition: opacity 150ms ease-out;
  user-select: none;
}
</style>
