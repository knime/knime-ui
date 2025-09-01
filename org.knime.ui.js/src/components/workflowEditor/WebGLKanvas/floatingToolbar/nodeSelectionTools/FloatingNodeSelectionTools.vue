<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { FunctionButton } from "@knime/components";
import AiIcon from "@knime/styles/img/icons/ai-general.svg";
import NodesAlignHorizIcon from "@knime/styles/img/icons/nodes-align-horiz.svg";
import NodesAlignVertIcon from "@knime/styles/img/icons/nodes-align-vert.svg";

import { useShortcuts } from "@/plugins/shortcuts";
import { useSelectionStore } from "@/store/selection";
import FloatingToolbar from "../FloatingToolbar.vue";

const { getSelectedNodes } = storeToRefs(useSelectionStore());
const canAlignNodes = computed(() => getSelectedNodes.value.length > 1);

const $shortcuts = useShortcuts();

const quickBuildShortcut = $shortcuts.get("openQuickBuildMenu");
const alignHorizontallyShortcut = $shortcuts.get("alignHorizontally");
const alignVerticallyShortcut = $shortcuts.get("alignVertically");

const quickBuildTitle = `${quickBuildShortcut.text} - ${quickBuildShortcut.hotkeyText}`;
const alignNodesHorizontallyTitle = `${alignHorizontallyShortcut.text} - ${alignHorizontallyShortcut.hotkeyText}`;
const alignNodesVerticallyTitle = `${alignVerticallyShortcut.text} - ${alignVerticallyShortcut.hotkeyText}`;
</script>

<template>
  <FloatingToolbar position="center">
    <FunctionButton
      :title="quickBuildTitle"
      data-test-id="node-selection-tool-quick-build"
      @pointerdown="$shortcuts.dispatch(quickBuildShortcut.name)"
    >
      <AiIcon />
    </FunctionButton>

    <FunctionButton
      :title="alignNodesHorizontallyTitle"
      :disabled="!canAlignNodes"
      data-test-id="node-selection-tool-align-horizontally"
      @pointerdown="$shortcuts.dispatch(alignHorizontallyShortcut.name)"
    >
      <NodesAlignHorizIcon />
    </FunctionButton>

    <FunctionButton
      :title="alignNodesVerticallyTitle"
      :disabled="!canAlignNodes"
      data-test-id="node-selection-tool-align-vertically"
      @pointerdown="$shortcuts.dispatch(alignVerticallyShortcut.name)"
    >
      <NodesAlignVertIcon />
    </FunctionButton>
  </FloatingToolbar>
</template>
