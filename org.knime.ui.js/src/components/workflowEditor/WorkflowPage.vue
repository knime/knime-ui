<script setup lang="ts">
import { computed, ref } from "vue";
import { debounce } from "lodash-es";
import { storeToRefs } from "pinia";

import { SplitPanel } from "@knime/components";

import LayoutEditorDialog from "@/components/layoutEditor/LayoutEditorDialog.vue";
import CanvasOverlayButtons from "@/components/sidebar/CanvasOverlayButtons.vue";
import CanvasOverlayCenter from "@/components/sidebar/CanvasOverlayCenter.vue";
import CanvasOverlayTopRight from "@/components/sidebar/CanvasOverlayTopRight.vue";
import SidebarFloatingPanel from "@/components/sidebar/SidebarFloatingPanel.vue";
import NodeOutput from "@/components/uiExtensions/NodeOutput.vue";
import TooltipContainer from "@/components/workflowEditor/SVGKanvas/tooltip/TooltipContainer.vue";
import { useApplicationSettingsStore } from "@/store/application/settings";
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

const splitPanelExpanded = ref(true);

const settingsStore = useSettingsStore();
// eslint-disable-next-line no-magic-numbers
const debouncedUpdateSetting = debounce(settingsStore.updateSetting, 5000);

const savedSecondarySize = computed({
  get() {
    return settingsStore.settings.nodeOutputSize;
  },
  set(value: number) {
    debouncedUpdateSetting({ key: "nodeOutputSize", value });
  },
});
</script>

<template>
  <div
    v-if="workflowStore.activeWorkflow && !workflowStore.error"
    id="workflow-page"
  >
    <TooltipContainer v-if="isSVGRenderer" id="tooltip-container" />

    <main class="workflow-area">
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
    <CanvasOverlayCenter />
    <CanvasOverlayTopRight />
    <SidebarFloatingPanel />
  </div>
</template>

<style lang="postcss" scoped>
#workflow-page {
  display: grid;
  grid-template:
    "workflow" auto
    / auto;
  height: 100%;
  background: var(--knime-white);
  color: var(--knime-masala);
  overflow: hidden;
}

main {
  display: flex;
  overflow: auto;
  flex-direction: column;
  align-items: stretch;
  height: 100%;
}

.workflow-area {
  grid-area: workflow;
  overflow: hidden;
}

.split-panel {
  --z-index-common-splitter: v-bind("$zIndices.layerStaticPanelDecorations");
}
</style>
