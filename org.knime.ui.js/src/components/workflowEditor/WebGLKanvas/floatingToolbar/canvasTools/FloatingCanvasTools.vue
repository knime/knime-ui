<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { FunctionButton } from "@knime/components";
import HandIcon from "@knime/styles/img/icons/hand.svg";
import MapIcon from "@knime/styles/img/icons/map.svg";
import LenseMinusIcon from "@knime/styles/img/icons/minus-small.svg";
import LensePlusIcon from "@knime/styles/img/icons/plus-small.svg";

import { useShortcuts } from "@/plugins/shortcuts";
import { useCanvasModesStore } from "@/store/application/canvasModes";
import { useSettingsStore } from "@/store/settings";

import ZoomMenu from "./ZoomMenu.vue";

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
</script>

<template>
  <div class="canvas-tools" @pointerdown.stop>
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
@import url("@/assets/mixins.css");

.canvas-tools {
  position: absolute;
  max-height: calc(v-bind("$shapes.floatingCanvasToolsSize") * 1px);
  bottom: calc(v-bind("$shapes.floatingCanvasToolsBottomOffset") * 1px);
  right: calc(v-bind("$shapes.floatingCanvasToolsBottomOffset") * 1px);
  display: flex;
  align-items: center;
  background: var(--knime-white);
  border: 1px solid var(--knime-gray-ultra-light);
  border-radius: 8px;
  box-shadow: var(--shadow-elevation-1);
  z-index: v-bind("$zIndices.layerCanvasDecorations");
  padding: var(--space-4);
}

.minimap-toggle {
  margin-left: 2px;
  margin-right: var(--space-6);
}
</style>
