<script setup lang="ts">
import LayoutEditorDialog from "@/components/layoutEditor/LayoutEditorDialog.vue";
import CanvasOverlayButtons from "@/components/sidebar/CanvasOverlayButtons.vue";
import CanvasOverlayCenter from "@/components/sidebar/CanvasOverlayCenter.vue";
import CanvasOverlayTopRight from "@/components/sidebar/CanvasOverlayTopRight.vue";
import SidebarFloatingPanel from "@/components/sidebar/SidebarFloatingPanel.vue";
import TooltipContainer from "@/components/workflowEditor/SVGKanvas/tooltip/TooltipContainer.vue";
import { useWorkflowStore } from "@/store/workflow/workflow";

import WorkflowPanel from "./WorkflowPanel.vue";
import { useCanvasRendererUtils } from "./util/canvasRenderer";

/**
 * Component that acts as a router page to render the workflow
 */
const workflowStore = useWorkflowStore();
const { isSVGRenderer } = useCanvasRendererUtils();
</script>

<template>
  <div
    v-if="workflowStore.activeWorkflow && !workflowStore.error"
    id="workflow-page"
  >
    <TooltipContainer v-if="isSVGRenderer" id="tooltip-container" />

    <main class="workflow-area">
      <WorkflowPanel id="workflow-panel" />
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
</style>
