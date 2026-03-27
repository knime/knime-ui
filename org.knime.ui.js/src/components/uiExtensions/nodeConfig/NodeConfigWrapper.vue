<script setup lang="ts">
import { computed, inject, nextTick, ref, watch } from "vue";
import { storeToRefs } from "pinia";

import { Button, FunctionButton } from "@knime/components";
import CircleInfoIcon from "@knime/styles/img/icons/circle-info.svg";
import CloseIcon from "@knime/styles/img/icons/close.svg";
import MinimizeDialogIcon from "@knime/styles/img/icons/minimize-large-dialog.svg";
import OpenDialogIcon from "@knime/styles/img/icons/open-large-dialog.svg";
import SettingsIcon from "@knime/styles/img/icons/settings.svg";

import AppRightPanelSkeleton from "@/components/application/AppSkeletonLoader/AppRightPanelSkeleton.vue";
import { useApplicationSettingsStore } from "@/store/application/settings";
import { useApplicationStore } from "@/store/application/application";
import { useNodeConfigurationStore } from "@/store/nodeConfiguration/nodeConfiguration";
import { useSettingsStore } from "@/store/settings";
import { useExecutionStore } from "@/store/workflow/execution";
import { useSelectionStore } from "@/store/selection";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import type { UIExtensionLoadingState } from "../common/types";

import WorkflowMetadata from "@/components/workflowMetadata/WorkflowMetadata.vue";
import NodeOutput from "../NodeOutput.vue";
import NodeConfigButtons from "./NodeConfigButtons.vue";
import NodeConfigJumpMarks from "./NodeConfigJumpMarks.vue";
import NodeConfigLoader from "./NodeConfigLoader.vue";
import { DIALOG_JUMP_MARKS_KEY } from "./dialogJumpMarksContext";
import { useDialogJumpMarks } from "./useDialogJumpMarks";

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
  showNodeDescriptionPanel,
} = storeToRefs(nodeConfigurationStore);
const { settings } = storeToRefs(useSettingsStore());

const workflowId = computed(() => activeWorkflow.value!.info.containerId);
const versionId = computed(() => activeWorkflow.value!.info.version);
const canBeEnlarged = computed(
  () => activeExtensionConfig.value?.canBeEnlarged ?? false,
);

defineEmits<{
  escapePressed: [];
  close: [];
}>();

const nodeInteractionsStore = useNodeInteractionsStore();

const nodeName = computed<string>(() =>
  activeContext.value
    ? nodeInteractionsStore.getNodeName(activeContext.value.node.id)
    : "",
);

const predecessorNodeIds = computed<string[]>(() => {
  if (!activeContext.value || !activeWorkflow.value) {
    return [];
  }
  const nodeId = activeContext.value.node.id;
  const seen = new Set<string>();
  for (const conn of Object.values(activeWorkflow.value.connections)) {
    if (conn.destNode === nodeId && !conn.flowVariableConnection) {
      seen.add(conn.sourceNode);
    }
  }
  return [...seen];
});

const successorNodeIds = computed<string[]>(() => {
  if (!activeContext.value || !activeWorkflow.value) {
    return [];
  }
  const nodeId = activeContext.value.node.id;
  const seen = new Set<string>();
  for (const conn of Object.values(activeWorkflow.value.connections)) {
    if (conn.sourceNode === nodeId && !conn.flowVariableConnection) {
      seen.add(conn.destNode);
    }
  }
  return [...seen];
});

const navigateToConnectedNode = async (nodeId: string) => {
  const selectionStore = useSelectionStore();
  const { wasAborted } = await selectionStore.tryClearSelection({
    keepNodesInSelection: [nodeId],
  });
  if (wasAborted) {
    return;
  }
};

const rightPanelWidth = computed(() => settings.value.nodeDialogSize);

const isUIExtensionLoading = computed(
  () => loadingState.value?.value === "loading",
);
const isUIExtensionReady = computed(
  () => loadingState.value?.value === "ready",
);

// ─── Jump marks & advanced options ───────────────────────────────────────────
const loaderContainerRef = ref<HTMLElement | null>(null);
const {
  sections: jumpMarkSections,
  hasAdvancedOptions,
  activeSection: jumpMarksActiveSection,
  connect: connectJumpMarks,
  activateSection,
  showAllSections,
  toggleAdvancedOptions: clickAdvancedOptions,
} = useDialogJumpMarks();
// NOTE: scrollTo is now internal to activateSection (scrolling mode)

const applicationSettingsStore = useApplicationSettingsStore();
const { showDialogAdvancedOptions, jumpMarksMode } = storeToRefs(applicationSettingsStore);

// When in floating-panel mode the parent provides a context we fill so it can
// render jump marks OUTSIDE the dialog panel. Absent that context (fixed side
// panel) we render an inline column ourselves.
const jumpMarksCtx = inject(DIALOG_JUMP_MARKS_KEY, null);
const hasExternalJumpMarks = !!jumpMarksCtx;

// Keep the external context's sections/state in sync
if (jumpMarksCtx) {
  watch(jumpMarkSections, (s) => { jumpMarksCtx.sections.value = s; });
  watch(hasAdvancedOptions, (v) => { jumpMarksCtx.hasAdvancedOptions.value = v; });
  watch(jumpMarksActiveSection, (i) => { jumpMarksCtx.activeSection.value = i; });
  // Register our activateSection as the callable from the floating panel
  jumpMarksCtx.activateFn.value = (index: number) =>
    activateSection(index, jumpMarksMode.value);
}

// When mode switches from tabs → scrolling, restore all hidden sections
watch(jumpMarksMode, (mode) => {
  if (mode === "scrolling") showAllSections();
});

// Auto-expand advanced options once per dialog load when the setting is on
let advancedAutoExpanded = false;
watch(hasAdvancedOptions, (hasAdv) => {
  if (hasAdv && showDialogAdvancedOptions.value && !advancedAutoExpanded) {
    advancedAutoExpanded = true;
    clickAdvancedOptions();
  }
});

const handleToggleAdvancedOptions = () => {
  clickAdvancedOptions();
  applicationSettingsStore.setShowDialogAdvancedOptions(!showDialogAdvancedOptions.value);
};

/** Called by the inline jump marks (side-panel mode). */
const handleActivateSection = (index: number) =>
  activateSection(index, jumpMarksMode.value);

watch(isUIExtensionReady, async (ready) => {
  if (ready && loaderContainerRef.value) {
    await nextTick();
    advancedAutoExpanded = false;
    connectJumpMarks(loaderContainerRef.value);
  }
});

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
        v-if="activeContext"
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

    <!-- Vertically-centered side navigation — only in large mode -->
    <div v-if="isLargeMode && predecessorNodeIds.length > 0" class="connected-nodes connected-nodes--left">
      <button
        v-for="connNodeId in predecessorNodeIds"
        :key="connNodeId"
        class="connected-node-btn"
        :title="nodeInteractionsStore.getNodeName(connNodeId)"
        @click="navigateToConnectedNode(connNodeId)"
      >
        {{ nodeInteractionsStore.getNodeName(connNodeId) }}
      </button>
    </div>
    <div v-if="isLargeMode && successorNodeIds.length > 0" class="connected-nodes connected-nodes--right">
      <button
        v-for="connNodeId in successorNodeIds"
        :key="connNodeId"
        class="connected-node-btn"
        :title="nodeInteractionsStore.getNodeName(connNodeId)"
        @click="navigateToConnectedNode(connNodeId)"
      >
        {{ nodeInteractionsStore.getNodeName(connNodeId) }}
      </button>
    </div>

      <div :class="['content', { 'large-mode': isLargeMode }]">
      <!-- Tab bar -->
      <div v-if="!isLargeMode" class="tab-bar header">
        <span class="tab-title">{{ nodeName || "Configuration" }}</span>
        <!-- Action buttons -->
        <div class="tab-actions">
          <FunctionButton
            v-if="hasAdvancedOptions"
            :title="showDialogAdvancedOptions ? 'Hide advanced settings' : 'Show advanced settings'"
            data-test-id="advanced-options-btn"
            class="advanced-options-btn"
            :class="{ active: showDialogAdvancedOptions }"
            compact
            @click="handleToggleAdvancedOptions"
          >
            <SettingsIcon />
          </FunctionButton>

          <FunctionButton
            v-if="activeContext"
            title="Expand into a more advanced configuration view"
            data-test-id="expand-dialog-btn"
            class="expand-btn"
            compact
            @click="nodeConfigurationStore.setIsLargeMode(true)"
          >
            <OpenDialogIcon />
          </FunctionButton>

          <FunctionButton
            v-if="activeContext"
            :title="showNodeDescriptionPanel ? 'Hide node description' : 'Show node description'"
            data-test-id="toggle-description-btn"
            class="description-toggle-btn"
            :class="{ active: showNodeDescriptionPanel }"
            compact
            @click="nodeConfigurationStore.showNodeDescriptionPanel = !nodeConfigurationStore.showNodeDescriptionPanel"
          >
            <CircleInfoIcon />
          </FunctionButton>
        </div>

        <!-- Close button — always at far right of tab bar -->
        <FunctionButton
          title="Close panel"
          data-test-id="close-panel-btn"
          class="close-panel-btn"
          compact
          @click="$emit('close')"
        >
          <CloseIcon />
        </FunctionButton>
      </div>

      <!-- Node configuration content -->
        <AppRightPanelSkeleton
          v-if="isUIExtensionLoading"
          :width="rightPanelWidth"
        />

        <template v-if="activeContext && activeContext.isEmbeddable">
          <div class="body-row">
            <!-- NodeOutput shown alongside dialog for non-enlargeable nodes in large mode -->
            <template v-if="isLargeMode && !canBeEnlarged">
              <div class="port-view-section">
                <NodeOutput />
              </div>
              <div class="panel-divider" />
            </template>
            <!-- Inline jump marks — only shown in fixed side-panel (not floating) mode -->
            <NodeConfigJumpMarks
              v-if="!hasExternalJumpMarks && jumpMarksMode !== 'disabled'"
              :sections="jumpMarkSections"
              :active-section="jumpMarksActiveSection"
              @activate-section="handleActivateSection"
            />
            <div ref="loaderContainerRef" class="loader-area">
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
                @escape-pressed="$emit('escapePressed')"
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
            </div>
          </div>
        </template>

        <!-- Nothing selected → show workflow description -->
        <WorkflowMetadata v-else-if="!activeContext" class="workflow-metadata-panel" />
        <!-- Selected but incompatible (metanode, legacy dialog, etc.) -->
        <slot v-else name="inactive" />

    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.node-configuration {
  --title-bar-height: var(--space-32);

  position: relative;
  height: 100%;

  & .title-bar {
    display: flex;
    gap: var(--space-8);
    align-items: center;
    justify-content: space-between;
    max-width: 100%;
    height: var(--title-bar-height);
    padding: 0 var(--space-4) 0 var(--space-12);
    color: var(--knime-white);
    background-color: var(--knime-masala);

    & .node-name {
      flex: 1;
      margin: 0;
      font-size: 18px;
      line-height: var(--title-bar-height);
      flex: 1;
      min-width: 0;

      @mixin truncate;
    }

    & .minimize-btn {
      padding: var(--space-4) var(--space-8);
      margin-bottom: 1px;
      color: var(--knime-white);
      white-space: nowrap;

      &:hover,
      &:focus {
        background-color: var(--knime-black-semi);
      }

      & .minimize-icon {
        margin-right: var(--space-4);
        stroke: var(--knime-white);
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
  }

  & .body-row {
    display: flex;
    flex-direction: row;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  & .loader-area {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }

  & .port-view-section {
    flex: 2;
    min-width: 220px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  & .panel-divider {
    width: 1px;
    flex-shrink: 0;
    background-color: var(--kds-color-border-default, var(--knime-silver-sand));
  }

  & .description-toggle-btn,
  & .advanced-options-btn {
    &.active {
      background-color: var(--kds-color-background-neutral-active);
    }
  }
}

.connected-nodes {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 1;
  padding: 8px 0;

  &.connected-nodes--left {
    left: 0;
    align-items: flex-start;
  }

  &.connected-nodes--right {
    right: 0;
    align-items: flex-end;
  }
}

.connected-node-btn {
  background: var(--knime-masala);
  border: none;
  border-radius: 0 4px 4px 0;
  color: var(--knime-white);
  cursor: pointer;
  font-size: 11px;
  line-height: 1.3;
  max-width: 120px;
  overflow: hidden;
  padding: 4px 8px 4px 6px;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  box-shadow: 2px 2px 6px rgb(0 0 0 / 25%);

  &:hover {
    background: color-mix(in srgb, var(--knime-white) 15%, var(--knime-masala));
  }

  .connected-nodes--right & {
    border-radius: 4px 0 0 4px;
    padding: 4px 6px 4px 8px;
    text-align: right;
  }
}

.tab-bar {
  display: flex;
  flex-direction: row;
  align-items: center;
  border-bottom: 1px solid var(--knime-silver-sand);
  height: var(--space-32);
  padding: 0 var(--space-4);
  gap: 0;
  flex-shrink: 0;

  & .tab-title {
    font-size: 13px;
    font-weight: 700;
    padding: 0 var(--space-12);
    color: var(--kds-color-text-and-icon-default);
    white-space: nowrap;
  }

  & .tab-actions {
    display: flex;
    align-items: center;
    margin-left: auto;
    gap: var(--space-4);
  }

  & .close-panel-btn {
    margin-left: auto;
    flex-shrink: 0;
  }

  /* When tab-actions is also present, it already consumed margin-left:auto,
     so the close button just sits right after it without extra margin. */
  & .tab-actions + .close-panel-btn {
    margin-left: 0;
  }
}


/* TODO: UIEXT-2775 use a different approach */
[aria-disabled="true"] {
  pointer-events: none;
  user-select: none;
  opacity: 0.7;
  transition: opacity 150ms ease-out;
}
</style>
