<script setup lang="ts">
import { computed, defineAsyncComponent, watch } from "vue";
import { storeToRefs } from "pinia";

import { navigatorUtils } from "@knime/utils";

import NodeConfigFloatingPanel from "@/components/uiExtensions/nodeConfig/NodeConfigFloatingPanel.vue";
import { useApplicationStore } from "@/store/application/application";
import { useCanvasModesStore } from "@/store/application/canvasModes";
import { useApplicationSettingsStore } from "@/store/application/settings";
import { useCanvasAnchoredComponentsStore } from "@/store/canvasAnchoredComponents/canvasAnchoredComponents";
import { usePanelStore } from "@/store/panel";
import { useSelectionStore } from "@/store/selection";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { useWorkflowVersionsStore } from "@/store/workflow/workflowVersions";

import ContextMenu from "./CanvasAnchoredComponents/ContextMenu/ContextMenu.vue";
import PortTypeMenu from "./CanvasAnchoredComponents/PortTypeMenu/PortTypeMenu.vue";
import QuickActionMenu from "./CanvasAnchoredComponents/QuickActionMenu/QuickActionMenu.vue";
import FloatingMenuPortalTarget from "./WebGLKanvas/FloatingMenu/FloatingMenuPortalTarget.vue";
import WorkflowInfoBar from "./WorkflowInfoBar/WorkflowInfoBar.vue";
import { useCanvasRendererUtils } from "./util/canvasRenderer";

const SVGKanvas = defineAsyncComponent({
  loader: () => import("./SVGKanvas/WorkflowCanvas.vue"),
});

const WebGLKanvas = defineAsyncComponent({
  loader: () => import("./WebGLKanvas/WorkflowCanvas.vue"),
});

const { useEmbeddedDialogs } = storeToRefs(useApplicationSettingsStore());
const { activeWorkflow, isWritable } = storeToRefs(useWorkflowStore());
const canvasAnchoredComponentsStore = useCanvasAnchoredComponentsStore();
const { portTypeMenu, quickActionMenu, contextMenu } = storeToRefs(
  canvasAnchoredComponentsStore,
);
const versionsStore = useWorkflowVersionsStore();
const applicationStore = useApplicationStore();

const { activeProjectId } = storeToRefs(applicationStore);

const { selectedNodeIds } = storeToRefs(useSelectionStore());
const { hasAnnotationModeEnabled } = storeToRefs(useCanvasModesStore());

const activeWorkflowId = computed(() => activeWorkflow.value!.info.containerId);
const { currentRenderer } = useCanvasRendererUtils();

const WorkflowCanvas = computed(() =>
  currentRenderer.value === "SVG" ? SVGKanvas : WebGLKanvas,
);

watch(selectedNodeIds, () => {
  if (quickActionMenu.value.isOpen) {
    quickActionMenu.value.events.menuClose?.();
  }
});

const closeContextMenu = (event?: MouseEvent) => {
  // TODO: NXT-3695 - review logic of this method, naming and usages after the SVG
  // canvas is removed. Currently, this component is used by both renderers, but in WebGL
  // this logic seems a bit repetitive / confusing
  if (contextMenu.value.isOpen) {
    canvasAnchoredComponentsStore.toggleContextMenu({ event });
  }
};

const panelStore = usePanelStore();
</script>

<template>
  <div
    :class="[
      'workflow-panel',
      { 'read-only': !isWritable },
      { 'annotation-cursor': hasAnnotationModeEnabled },
    ]"
    @pointerdown.right="closeContextMenu"
    @pointerdown.left.ctrl="
      navigatorUtils.isMac() ? closeContextMenu($event) : null
    "
  >
    <ContextMenu
      v-if="contextMenu.isOpen"
      :position="contextMenu.position!"
      @menu-close="closeContextMenu"
    />

    <PortTypeMenu
      v-if="portTypeMenu.isOpen"
      v-bind="portTypeMenu.props!"
      v-on="portTypeMenu.events"
    />

    <QuickActionMenu
      v-if="quickActionMenu.isOpen"
      v-bind="quickActionMenu.props!"
      v-on="quickActionMenu.events"
    />

    <PortalTarget name="annotation-editor-toolbar" tag="div" />

    <!-- webgl only -->
    <FloatingMenuPortalTarget />

    <WorkflowInfoBar />

    <!--
      Setting key to match exactly one workflow, causes knime-ui to re-render the whole component,
      instead of diffing old and new workflow.
    -->
    <WorkflowCanvas :key="`${activeProjectId}-${activeWorkflowId}`" />

    <!-- Floating node configuration / versions panel -->
    <NodeConfigFloatingPanel
      v-if="
        (useEmbeddedDialogs || versionsStore.isSidepanelOpen) &&
        panelStore.isRightPanelExpanded
      "
    />
  </div>
</template>

<style lang="postcss" scoped>
.workflow-panel {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.read-only {
  background-color: var(--knime-gray-ultra-light);
}

.annotation-cursor {
  cursor: crosshair;
}


</style>
