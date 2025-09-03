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
import FloatingToolbar from "../FloatingToolbar.vue";

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
  <FloatingToolbar position="right">
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
  </FloatingToolbar>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.minimap-toggle {
  margin-left: 2px;
  margin-right: var(--space-6);
}
</style>
