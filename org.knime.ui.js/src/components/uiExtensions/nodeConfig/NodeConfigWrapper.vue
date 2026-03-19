<script setup lang="ts">
import { computed, inject, nextTick, ref, shallowRef, watch } from "vue";
import { storeToRefs } from "pinia";

import { Button, FunctionButton } from "@knime/components";
import CircleInfoIcon from "@knime/styles/img/icons/circle-info.svg";
import MinimizeDialogIcon from "@knime/styles/img/icons/minimize-large-dialog.svg";
import OpenDialogIcon from "@knime/styles/img/icons/open-large-dialog.svg";
import SettingsIcon from "@knime/styles/img/icons/settings.svg";

import AppRightPanelSkeleton from "@/components/application/AppSkeletonLoader/AppRightPanelSkeleton.vue";
import RightPanelHeader from "@/components/common/side-panel/RightPanelHeader.vue";
import { useApplicationSettingsStore } from "@/store/application/settings";
import { useApplicationStore } from "@/store/application/application";
import { useNodeConfigurationStore } from "@/store/nodeConfiguration/nodeConfiguration";
import { usePanelStore } from "@/store/panel";
import { useSettingsStore } from "@/store/settings";
import { useExecutionStore } from "@/store/workflow/execution";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import type { UIExtensionLoadingState } from "../common/types";

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
const panelStore = usePanelStore();

const workflowId = computed(() => activeWorkflow.value!.info.containerId);
const versionId = computed(() => activeWorkflow.value!.info.version);
const canBeEnlarged = computed(
  () => activeExtensionConfig.value?.canBeEnlarged ?? false,
);

defineEmits<{
  escapePressed: [];
}>();

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
      <RightPanelHeader
        v-if="!isLargeMode"
        :title="nodeName"
        @close="panelStore.isRightPanelExpanded = false"
      >
        <template #actions>
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
        </template>
      </RightPanelHeader>

      <AppRightPanelSkeleton
        v-if="isUIExtensionLoading"
        :width="rightPanelWidth"
      />

      <template v-if="activeContext && activeContext.isEmbeddable">
        <div class="body-row">
          <!-- Inline jump marks — only shown in fixed side-panel (not floating) mode -->
          <NodeConfigJumpMarks
            v-if="!hasExternalJumpMarks"
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

      <slot v-else name="inactive" />
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.node-configuration {
  --title-bar-height: var(--space-32);

  height: 100%;

  & .title-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-8);
    color: var(--knime-white);
    background-color: var(--knime-masala);
    max-width: 100%;
    padding: 0 var(--space-4) 0 var(--space-12);
    height: var(--title-bar-height);

    & .node-name {
      margin: 0;
      font-size: 18px;
      line-height: var(--title-bar-height);
      flex: 1;

      @mixin truncate;
    }

    & .minimize-btn {
      color: var(--knime-white);
      margin-bottom: 1px;
      padding: var(--space-4) var(--space-8);
      white-space: nowrap;

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

  & .description-toggle-btn,
  & .advanced-options-btn {
    &.active {
      background-color: var(--kds-color-background-neutral-active);
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
