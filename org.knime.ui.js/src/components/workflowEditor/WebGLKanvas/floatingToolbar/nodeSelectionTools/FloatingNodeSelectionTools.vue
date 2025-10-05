<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
import { storeToRefs } from "pinia";

import { FunctionButton } from "@knime/components";
import AiIcon from "@knime/styles/img/icons/ai-general.svg";
import NodesAlignHorizIcon from "@knime/styles/img/icons/nodes-align-horiz.svg";
import NodesAlignVertIcon from "@knime/styles/img/icons/nodes-align-vert.svg";

import { useTooltip } from "@/components/workflowEditor/common/useTooltip";
import type { TooltipDefinition } from "@/components/workflowEditor/types";
import { useShortcuts } from "@/plugins/shortcuts";
import { useSelectionStore } from "@/store/selection";
import FloatingToolbar from "../FloatingToolbar.vue";

const { getSelectedNodes } = storeToRefs(useSelectionStore());
const canAlignNodes = computed(() => getSelectedNodes.value.length > 1);

const $shortcuts = useShortcuts();

const quickBuildShortcut = $shortcuts.get("openQuickBuildMenu");
const alignHorizontallyShortcut = $shortcuts.get("alignLeft");
const alignVerticallyShortcut = $shortcuts.get("alignTop");

const quickBuildTitle = `${quickBuildShortcut.text} - ${quickBuildShortcut.hotkeyText}`;
const alignNodesHorizontallyTitle = `${alignHorizontallyShortcut.text} - ${alignHorizontallyShortcut.hotkeyText}`;
const alignNodesVerticallyTitle = `${alignVerticallyShortcut.text} - ${alignVerticallyShortcut.hotkeyText}`;

const alignHorizontallyWrapperRef = useTemplateRef<Element>(
  "alignHorizontallyWrapper",
);
const alignVerticallyWrapperRef = useTemplateRef<Element>(
  "alignVerticallyWrapper",
);

// show tooltip on hover over disabled node alignment buttons (only one node is selected)
const alignmentTooltip = computed<TooltipDefinition | null>(() => {
  if (canAlignNodes.value) {
    return null;
  }

  return {
    position: { x: 0, y: 0 }, // placeholder, auto-computed by useTooltip
    gap: 4,
    orientation: "top",
    text: "Select two or more nodes to enable node-alignment actions",
  };
});

useTooltip({
  tooltip: alignmentTooltip,
  element: alignHorizontallyWrapperRef,
});
useTooltip({
  tooltip: alignmentTooltip,
  element: alignVerticallyWrapperRef,
});
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

    <div ref="alignHorizontallyWrapper">
      <FunctionButton
        :title="alignNodesHorizontallyTitle"
        :disabled="!canAlignNodes"
        data-test-id="node-selection-tool-align-horizontally"
        @pointerdown="$shortcuts.dispatch(alignHorizontallyShortcut.name)"
      >
        <NodesAlignHorizIcon />
      </FunctionButton>
    </div>

    <div ref="alignVerticallyWrapper">
      <FunctionButton
        :title="alignNodesVerticallyTitle"
        :disabled="!canAlignNodes"
        data-test-id="node-selection-tool-align-vertically"
        @pointerdown="$shortcuts.dispatch(alignVerticallyShortcut.name)"
      >
        <NodesAlignVertIcon />
      </FunctionButton>
    </div>

    <FunctionButton
      title="Center"
      @pointerdown="$shortcuts.dispatch('alignCenter')"
    >
      C
    </FunctionButton>

    <FunctionButton
      title="Middle"
      @pointerdown="$shortcuts.dispatch('alignMiddle')"
    >
      M
    </FunctionButton>
  </FloatingToolbar>
</template>
