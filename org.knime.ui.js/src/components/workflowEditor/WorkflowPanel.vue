<script setup lang="ts">
import { computed, defineAsyncComponent, watch } from "vue";
import { storeToRefs } from "pinia";

import { navigatorUtils } from "@knime/utils";

import SplitPanel from "@/components/common/SplitPanel.vue";
import NodeConfig from "@/components/uiExtensions/nodeConfig/NodeConfig.vue";
import { useApplicationStore } from "@/store/application/application";
import { useCanvasModesStore } from "@/store/application/canvasModes";
import { useApplicationSettingsStore } from "@/store/application/settings";
import { useSelectionStore } from "@/store/selection";
import { useSettingsStore } from "@/store/settings";
import { useFloatingMenusStore } from "@/store/workflow/floatingMenus";
import { useWorkflowStore } from "@/store/workflow/workflow";

import ContextMenu from "./CanvasAnchoredComponents/ContextMenu/ContextMenu.vue";
import PortTypeMenu from "./CanvasAnchoredComponents/PortTypeMenu/PortTypeMenu.vue";
import QuickActionMenu from "./CanvasAnchoredComponents/QuickActionMenu/QuickActionMenu.vue";
import WorkflowInfoBar from "./WorkflowInfoBar/WorkflowInfoBar.vue";
import { canvasRendererUtils } from "./util/canvasRenderer";

const WorkflowCanvas = defineAsyncComponent({
  loader: () => {
    return canvasRendererUtils.isSVGRenderer()
      ? import("./SVGKanvas/WorkflowCanvas.vue")
      : import("./WebGLKanvas/WorkflowCanvas.vue");
  },
});

const { useEmbeddedDialogs } = storeToRefs(useApplicationSettingsStore());
const { activeWorkflow, isWritable } = storeToRefs(useWorkflowStore());
const { portTypeMenu, quickActionMenu } = storeToRefs(useFloatingMenusStore());
const applicationStore = useApplicationStore();

const { contextMenu, activeProjectId } = storeToRefs(applicationStore);
const { selectedNodeIds } = useSelectionStore();
const { hasAnnotationModeEnabled } = useCanvasModesStore();

const activeWorkflowId = computed(() => activeWorkflow.value!.info.containerId);

const nodeDialogSize = computed({
  get() {
    return useSettingsStore().settings.nodeDialogSize;
  },
  set(value: number) {
    useSettingsStore().updateSetting({
      key: "nodeDialogSize",
      value,
    });
  },
});

watch(selectedNodeIds, () => {
  if (quickActionMenu.value.isOpen) {
    quickActionMenu.value.events.menuClose?.();
  }
});

const closeContextMenu = (event?: MouseEvent) => {
  if (contextMenu.value.isOpen) {
    applicationStore.toggleContextMenu({ event });
  }
};
</script>

<template>
  <div
    :class="[
      'workflow-panel',
      { 'read-only': !isWritable },
      { 'annotation-cursor': hasAnnotationModeEnabled },
    ]"
    @pointerdown.right="closeContextMenu($event)"
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

    <WorkflowInfoBar />

    <SplitPanel
      v-if="useEmbeddedDialogs"
      v-model:secondary-size="nodeDialogSize"
      splitter-id="node-config-split-panel"
      direction="right"
      use-pixel
      :secondary-snap-size="360"
      :secondary-max-size="900"
      style="--splitter-background-color: var(--knime-gray-ultra-light)"
      keep-element-on-close
    >
      <!--
      Setting key to match exactly one workflow, causes knime-ui to re-render the whole component,
      instead of diffing old and new workflow.
    -->
      <WorkflowCanvas :key="`${activeProjectId}-${activeWorkflowId}`" />
      <template #secondary>
        <NodeConfig />
      </template>
    </SplitPanel>

    <WorkflowCanvas v-else :key="`${activeProjectId}-${activeWorkflowId}`" />
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
