<script setup lang="ts">
import { computed, ref } from "vue";
import { debounce } from "lodash-es";
import { storeToRefs } from "pinia";

import { SplitPanel } from "@knime/components";

import KaiCompact from "@/components/kai/KaiCompact.vue";
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
const { dockedRightPanelWidth, isKaiCompactOpen, isDeployPanelOpen, isSearchPanelOpen } =
  storeToRefs(panelStore);

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
  if (nodeOutputLayout.value !== "bottom" || !splitPanelExpanded.value) {
    return "0px";
  }
  return `${liveSecondarySize.value}dvh`;
});
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
      :style="dockedRightPanelWidth ? { paddingRight: `${dockedRightPanelWidth}px` } : {}"
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

    <!-- Compact K-AI input — centered, above bottom panel -->
    <div class="kai-bottom-center-overlay">
      <SelectionKaiOverlay v-if="!isKaiCompactOpen" />
      <div v-if="isKaiCompactOpen" class="kai-compact-pill">
        <KaiCompact @close="panelStore.isKaiCompactOpen = false" />
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
</style>
