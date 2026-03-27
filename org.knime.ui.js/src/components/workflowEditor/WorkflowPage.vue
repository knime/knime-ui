<script setup lang="ts">
import { computed, ref } from "vue";
import { debounce } from "lodash-es";
import { storeToRefs } from "pinia";

import { SplitPanel } from "@knime/components";

import KaiCompact from "@/components/kai/KaiCompact.vue";
import KaiRightPanel from "@/components/kai/KaiRightPanel.vue";
import SelectionKaiOverlay from "@/components/workflowEditor/SelectionKaiOverlay.vue";

import LayoutEditorDialog from "@/components/layoutEditor/LayoutEditorDialog.vue";
import CanvasOverlayActions from "@/components/sidebar/CanvasOverlayActions.vue";
import CanvasOverlayButtons from "@/components/sidebar/CanvasOverlayButtons.vue";
import CanvasOverlayCenter from "@/components/sidebar/CanvasOverlayCenter.vue";
import CanvasOverlayTopRight from "@/components/sidebar/CanvasOverlayTopRight.vue";
import DeployPanel from "@/components/sidebar/DeployPanel.vue";
import WorkflowSearchPanel from "@/components/workflowEditor/WorkflowSearchPanel.vue";
import SidebarFloatingPanel from "@/components/sidebar/SidebarFloatingPanel.vue";
import NodeOutput from "@/components/uiExtensions/NodeOutput.vue";
import NodeOutputDockedConfigPanel from "@/components/uiExtensions/NodeOutputDockedConfigPanel.vue";
import TooltipContainer from "@/components/workflowEditor/SVGKanvas/tooltip/TooltipContainer.vue";
import { useApplicationSettingsStore } from "@/store/application/settings";
import { usePanelStore } from "@/store/panel";
import { useSettingsStore } from "@/store/settings";
import { useWorkflowStore } from "@/store/workflow/workflow";

import WorkflowPanel from "./WorkflowPanel.vue";
import { useCanvasRendererUtils } from "./util/canvasRenderer";

/**
 * Component that acts as a router page to render the workflow
 */
const workflowStore = useWorkflowStore();
const { isSVGRenderer } = useCanvasRendererUtils();
const { nodeOutputLayout } = storeToRefs(useApplicationSettingsStore());
const panelStore = usePanelStore();
const { dockedRightPanelWidth, isKaiCompactOpen, isDeployPanelOpen, isSearchPanelOpen, kaiPlacement } =
  storeToRefs(panelStore);

// KAI right overlay width matches the CSS formula: calc(var(--cfg-panel-right-width, 400px) - 40px)
const KAI_RIGHT_PANEL_WIDTH = 360;

const showKaiRightOverlay = computed(
  () => kaiPlacement.value === "rightPanel" && isKaiCompactOpen.value,
);

// Effective right padding: takes the larger of the docked config panel width and the KAI right panel
const effectiveRightPadding = computed(() =>
  showKaiRightOverlay.value
    ? Math.max(dockedRightPanelWidth.value, KAI_RIGHT_PANEL_WIDTH)
    : dockedRightPanelWidth.value,
);

const splitPanelExpanded = ref(true);

const settingsStore = useSettingsStore();
// eslint-disable-next-line no-magic-numbers
const debouncedUpdateSetting = debounce(settingsStore.updateSetting, 5000);

// Tracks the live resize value immediately (the store update is debounced)
const liveSecondarySize = ref(settingsStore.settings.nodeOutputSize);

const savedSecondarySize = computed({
  get() {
    return settingsStore.settings.nodeOutputSize;
  },
  set(value: number) {
    liveSecondarySize.value = value;
    debouncedUpdateSetting({ key: "nodeOutputSize", value });
  },
});

const kaiBottomOffset = computed(() => {
  if (
    (nodeOutputLayout.value !== "bottom" && nodeOutputLayout.value !== "right") ||
    !splitPanelExpanded.value
  ) {
    return "0px";
  }
  return `${liveSecondarySize.value}dvh`;
});

const showKaiBottomOverlay = computed(
  () => kaiPlacement.value === "centerStage",
);
</script>

<template>
  <div
    v-if="workflowStore.activeWorkflow && !workflowStore.error"
    id="workflow-page"
    :style="dockedRightPanelWidth ? { '--cfg-panel-right-width': `${dockedRightPanelWidth}px` } : {}"
  >
    <TooltipContainer v-if="isSVGRenderer" id="tooltip-container" />

    <main
      class="workflow-area"
      :style="effectiveRightPadding ? { paddingRight: `${effectiveRightPadding}px` } : {}"
    >
      <SplitPanel
        v-if="nodeOutputLayout === 'bottom'"
        v-model:expanded="splitPanelExpanded"
        v-model:secondary-size="savedSecondarySize"
        class="split-panel"
        splitter-id="node-output-split-panel"
        direction="down"
        :secondary-max-size="90"
        :secondary-snap-size="15"
      >
        <WorkflowPanel id="workflow-panel" />
        <template #secondary>
          <NodeOutput />
        </template>
      </SplitPanel>
      <SplitPanel
        v-else-if="nodeOutputLayout === 'right'"
        v-model:expanded="splitPanelExpanded"
        v-model:secondary-size="savedSecondarySize"
        class="split-panel"
        splitter-id="node-output-right-split-panel"
        direction="down"
        :secondary-max-size="90"
        :secondary-snap-size="15"
      >
        <WorkflowPanel id="workflow-panel" />
        <template #secondary>
          <NodeOutputDockedConfigPanel />
        </template>
      </SplitPanel>
      <WorkflowPanel v-else id="workflow-panel" />
    </main>

    <LayoutEditorDialog />

    <!-- Canvas overlays -->
    <CanvasOverlayButtons />
    <div class="canvas-top-center-bar">
      <CanvasOverlayCenter />
      <CanvasOverlayActions />
    </div>
    <CanvasOverlayTopRight />
    <DeployPanel v-if="isDeployPanelOpen" />
    <WorkflowSearchPanel v-if="isSearchPanelOpen" />
    <SidebarFloatingPanel />

    <div v-if="showKaiRightOverlay" class="kai-right-overlay">
      <KaiRightPanel />
    </div>

    <!-- Compact K-AI input — centered, above bottom panel -->
    <div v-if="showKaiBottomOverlay" class="kai-bottom-center-overlay">
      <SelectionKaiOverlay v-if="!isKaiCompactOpen" />
      <div v-if="isKaiCompactOpen" class="kai-compact-pill">
        <KaiCompact @close="panelStore.closeKaiCompact()" />
      </div>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
#workflow-page {
  display: grid;
  grid-template:
    "workflow" auto
    / auto;
  height: 100%;
  overflow: hidden;
  color: var(--knime-masala);
  background: var(--knime-white);
}

main {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  height: 100%;
  overflow: auto;
}

.workflow-area {
  grid-area: workflow;
  overflow: hidden;
  transition: padding-right 200ms ease;
}

.canvas-top-center-bar {
  position: fixed;
  z-index: v-bind("$zIndices.layerStaticPanelDecorations");
  top: calc(var(--kds-spacing-container-0-75x) + 40px);
  left: calc(50% - var(--cfg-panel-right-width, 0px) / 2);
  transform: translateX(-50%);
  transition: left 200ms ease;
  display: flex;
  align-items: center;
  gap: var(--kds-spacing-container-0-5x);
}

.split-panel {
  --z-index-common-splitter: v-bind("$zIndices.layerStaticPanelDecorations");
}

.kai-bottom-center-overlay {
  position: fixed;
  z-index: v-bind("$zIndices.layerStaticPanelDecorations");
  bottom: calc(-4px + v-bind(kaiBottomOffset));
  left: calc(50% - var(--cfg-panel-right-width, 0px) / 2);
  transform: translateX(-50%);
  transition: bottom 150ms ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--kds-spacing-container-0-5x);
}

.kai-compact-pill {
  width: 480px;
  background-color: var(--kds-color-surface-default);
  border-radius: var(--kds-border-radius-container-0-50x);
  box-shadow: var(--shadow-elevation-1);

  /* visible so the X close button can sit outside the top-right corner */
  overflow: visible;
}

.kai-right-overlay {
  position: fixed;
  z-index: v-bind("$zIndices.layerToasts");
  top: 0;
  right: 0;
  width: calc(var(--cfg-panel-right-width, 400px) - 40px);
  height: 100dvh;
  background-color: color-mix(
    in srgb,
    var(--kds-color-surface-default) 72%,
    transparent
  );
  backdrop-filter: blur(32px);
  -webkit-backdrop-filter: blur(32px);
  border-left: 1px solid var(--kds-color-border-default, var(--knime-silver-sand));
  box-shadow: var(--shadow-elevation-2);
  overflow: hidden;
}
</style>
