<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { FunctionButton, type MenuItem, SubMenu } from "@knime/components";
// import ArrowsExpandIcon from "@knime/styles/img/icons/arrows-expand.svg";
import LenseMinusIcon from "@knime/styles/img/icons/lense-minus.svg";
import LensePlusIcon from "@knime/styles/img/icons/lense-plus.svg";
import ListIcon from "@knime/styles/img/icons/list.svg";

import HandIcon from "@/assets/hand.svg";
import { useShortcuts } from "@/plugins/shortcuts";
import type { FormattedShortcut, ShortcutName } from "@/shortcuts";
import { useCanvasModesStore } from "@/store/application/canvasModes";
import { useSelectionStore } from "@/store/selection";

import ZoomMenu from "./ZoomMenu.vue";

const $shortcuts = useShortcuts();
const { selectedNodeIds } = storeToRefs(useSelectionStore());

const alignmentShortcuts = [
  "alignHorizontally",
  "alignVertically",
] as ShortcutName[];

const alignmentOptions = computed<MenuItem[]>(() => {
  return alignmentShortcuts.map((action) =>
    $shortcuts.get(action),
  ) as MenuItem[];
});

const isAlignmentDisabled = computed(() => selectedNodeIds.value.length === 0);

const onAligmentOptionClick = (
  _event: KeyboardEvent,
  item: FormattedShortcut,
) => {
  $shortcuts.dispatch(item.name);
};

// TODO: simplify by just adding single state to canvas store
const { hasPanModeEnabled: isPanModeActive, canvasMode } = storeToRefs(
  useCanvasModesStore(),
);

const togglePanMode = () => {
  canvasMode.value = canvasMode.value === "pan" ? "selection" : "pan";
};
</script>

<template>
  <div class="canvas-tools">
    <FunctionButton
      class="hand"
      :active="isPanModeActive"
      @click="togglePanMode"
    >
      <HandIcon />
    </FunctionButton>

    <FunctionButton
      title="Zoom out"
      @pointerdown.stop="$shortcuts.dispatch('zoomOut')"
    >
      <LenseMinusIcon />
    </FunctionButton>

    <ZoomMenu />

    <FunctionButton
      title="Zoom in"
      @pointerdown.stop="$shortcuts.dispatch('zoomIn')"
    >
      <LensePlusIcon />
    </FunctionButton>

    <SubMenu
      :teleport-to-body="false"
      :items="alignmentOptions"
      :disabled="isAlignmentDisabled"
      orientation="top"
      @item-click="onAligmentOptionClick"
    >
      <ListIcon />
    </SubMenu>
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
  z-index: v-bind("$zIndices.layerToasts");
  padding: var(--space-4);
  gap: var(--space-4);

  & .hand {
    &:deep(path) {
      stroke-width: 1;
    }
  }
}
</style>
