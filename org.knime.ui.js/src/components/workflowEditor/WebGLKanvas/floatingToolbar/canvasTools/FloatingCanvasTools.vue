<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { FunctionButton } from "@knime/components";
import { KdsButton } from "@knime/kds-components";
import HandIcon from "@knime/styles/img/icons/hand.svg";
import MapIcon from "@knime/styles/img/icons/map.svg";
import LenseMinusIcon from "@knime/styles/img/icons/minus-small.svg";
import LensePlusIcon from "@knime/styles/img/icons/plus-small.svg";

import { useAddNodeViaFileUpload } from "@/components/nodeTemplates/useAddNodeViaFileUpload";
import { isBrowser } from "@/environment";
import { useShortcuts } from "@/plugins/shortcuts";
import { useCanvasModesStore } from "@/store/application/canvasModes";
import { useLifecycleStore } from "@/store/application/lifecycle";
import { useApplicationSettingsStore } from "@/store/application/settings";
import { useSettingsStore } from "@/store/settings";
import { useWorkflowStore } from "@/store/workflow/workflow";

import ZoomMenu from "./ZoomMenu.vue";

const { isLoadingWorkflow } = storeToRefs(useLifecycleStore());
const { isWorkflowEmpty } = storeToRefs(useWorkflowStore());

const { importFilesViaDialog } = useAddNodeViaFileUpload();

const $shortcuts = useShortcuts();
const minimapShortcut = $shortcuts.get("toggleMinimap");
const zoomOutShortcut = $shortcuts.get("zoomOut");
const zoomInShortcut = $shortcuts.get("zoomIn");

const isMinimapVisible = computed(
  () => useSettingsStore().settings.isMinimapVisible,
);

const { hasPanModeEnabled: isPanModeActive } = storeToRefs(
  useCanvasModesStore(),
);

// only show this button in dev mode for now as it needs to have a different design
const applicationSettingsStore = useApplicationSettingsStore();
const { devMode } = storeToRefs(applicationSettingsStore);
</script>

<template>
  <div
    v-if="!isLoadingWorkflow && isBrowser() && devMode"
    class="workflow-actions toolbar"
    @pointerdown.stop
  >
    <KdsButton
      title="Upload a local data file. A node that reads this file will be added automatically."
      data-test-id="wf-action-add-node-by-file"
      leading-icon="file-text"
      variant="transparent"
      @pointerdown="importFilesViaDialog"
    />
  </div>
  <div v-if="!isWorkflowEmpty" class="canvas-tools toolbar" @pointerdown.stop>
    <FunctionButton
      :title="`Toggle pan mode – ${
        $shortcuts.get('switchToPanMode').hotkeyText
      }`"
      :active="isPanModeActive"
      data-test-id="canvas-tool-pan-mode"
      @pointerdown="$shortcuts.dispatch('switchToPanMode')"
    >
      <HandIcon />
    </FunctionButton>

    <FunctionButton
      :title="`${minimapShortcut.text} – ${minimapShortcut.hotkeyText}`"
      class="minimap-toggle"
      :active="isMinimapVisible"
      data-test-id="canvas-tool-minimap-toggle"
      @pointerdown="$shortcuts.dispatch(minimapShortcut.name)"
    >
      <MapIcon />
    </FunctionButton>

    <FunctionButton
      :title="`Zoom out – ${zoomOutShortcut.hotkeyText}`"
      data-test-id="canvas-tool-zoom-out"
      @pointerdown="$shortcuts.dispatch(zoomOutShortcut.name)"
    >
      <LenseMinusIcon />
    </FunctionButton>

    <ZoomMenu />

    <FunctionButton
      :title="`Zoom in – ${zoomInShortcut.hotkeyText}`"
      data-test-id="canvas-tool-zoom-in"
      @pointerdown="$shortcuts.dispatch(zoomInShortcut.name)"
    >
      <LensePlusIcon />
    </FunctionButton>
  </div>
</template>

<style lang="postcss" scoped>
.toolbar {
  position: absolute;
  max-height: calc(v-bind("$shapes.floatingCanvasToolsSize") * 1px);
  bottom: calc(v-bind("$shapes.floatingCanvasToolsBottomOffset") * 1px);
  display: flex;
  align-items: center;
  background: var(--knime-white);
  border: var(--kds-border-base-subtle);
  border-radius: var(--kds-border-radius-container-0-50x);
  box-shadow: var(--kds-elevation-level-1);
  z-index: v-bind("$zIndices.layerCanvasDecorations");
  padding: var(--kds-spacing-container-0-25x);
}

.workflow-actions {
  left: calc(v-bind("$shapes.floatingCanvasToolsBottomOffset") * 1px);
}

.canvas-tools {
  right: calc(v-bind("$shapes.floatingCanvasToolsBottomOffset") * 1px);
}

.minimap-toggle {
  margin-left: var(--kds-spacing-container-0-12x);
  margin-right: var(--kds-spacing-container-0-37x);
}
</style>
