<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
import { storeToRefs } from "pinia";

import { FunctionButton } from "@knime/components";
import AiTextIcon from "@knime/styles/img/icons/ai-description.svg";
import AiIcon from "@knime/styles/img/icons/ai-general.svg";
import NodesAlignHorizIcon from "@knime/styles/img/icons/nodes-align-horiz.svg";
import NodesAlignVertIcon from "@knime/styles/img/icons/nodes-align-vert.svg";

import { useTooltip } from "@/components/workflowEditor/common/useTooltip";
import type { TooltipDefinition } from "@/components/workflowEditor/types";
import { useShortcuts } from "@/plugins/shortcuts";
import { useAIAssistantStore } from "@/store/ai/aiAssistant";
import { useSelectionStore } from "@/store/selection";
import FloatingToolbar from "../FloatingToolbar.vue";

const { usage } = storeToRefs(useAIAssistantStore());
const hasAiUsageRemaining = computed(() => {
  if (!usage.value || !usage.value.limit) {
    return true;
  }

  return usage.value.used < usage.value.limit;
});

const { getSelectedNodes } = storeToRefs(useSelectionStore());
const canAlignNodes = computed(() => getSelectedNodes.value.length > 1);
const isOnlyOneNodeSelected = computed(
  () => getSelectedNodes.value.length === 1,
);

const $shortcuts = useShortcuts();
const quickBuildShortcut = $shortcuts.get("openQuickBuildMenu");
const generateAnnotationShortcut = $shortcuts.get("generateAnnotation");
const alignHorizontallyShortcut = $shortcuts.get("alignHorizontally");
const alignVerticallyShortcut = $shortcuts.get("alignVertically");

// web-native tooltip text for each button, shown on hover when button is not disabled
const quickBuildTitle = `${quickBuildShortcut.text} – ${quickBuildShortcut.hotkeyText}`;
const generateAnnotationTitle = `${generateAnnotationShortcut.text} – ${generateAnnotationShortcut.hotkeyText}`;
const alignNodesHorizontallyTitle = `${alignHorizontallyShortcut.text} – ${alignHorizontallyShortcut.hotkeyText}`;
const alignNodesVerticallyTitle = `${alignVerticallyShortcut.text} – ${alignVerticallyShortcut.hotkeyText}`;

// show hover AI usage Tooltip over AI buttons
const aiUsageTooltip = computed<TooltipDefinition | null>(() => {
  if (!usage.value || !usage.value.limit) {
    return null;
  }

  return {
    position: { x: 0, y: 0 }, // placeholder, auto-computed by useTooltip
    gap: 4,
    orientation: "top",
    text: `${usage.value.used}/${usage.value.limit} monthly interations`,
  };
});

// show hover Tooltip over disabled node alignment buttons (only one node is selected)
const alignmentTooltip = computed<TooltipDefinition | null>(() => {
  if (!isOnlyOneNodeSelected.value) {
    return null;
  }

  return {
    position: { x: 0, y: 0 }, // placeholder, auto-computed by useTooltip
    gap: 4,
    orientation: "top",
    text: "Select two or more nodes to enable node-alignment actions",
  };
});

// template refs for attaching Tooltip components to
const quickBuildWrapperRef = useTemplateRef<Element>("quickBuild");
const generateAnnotationWrapperRef =
  useTemplateRef<Element>("generateAnnotation");
const alignHorizontallyWrapperRef =
  useTemplateRef<Element>("alignHorizontally");
const alignVerticallyWrapperRef = useTemplateRef<Element>("alignVertically");

useTooltip({
  tooltip: aiUsageTooltip,
  element: quickBuildWrapperRef,
});
useTooltip({
  tooltip: aiUsageTooltip,
  element: generateAnnotationWrapperRef,
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
    <div ref="quickBuild">
      <FunctionButton
        :title="quickBuildTitle"
        :disabled="!hasAiUsageRemaining"
        data-test-id="node-selection-tool-quick-build"
        @pointerdown="$shortcuts.dispatch(quickBuildShortcut.name)"
      >
        <AiIcon />
      </FunctionButton>
    </div>

    <div ref="generateAnnotation">
      <FunctionButton
        :title="generateAnnotationTitle"
        :disabled="!hasAiUsageRemaining"
        data-test-id="node-selection-tool-generate-annotation"
        @pointerdown="$shortcuts.dispatch(generateAnnotationShortcut.name)"
      >
        <AiTextIcon />
      </FunctionButton>
    </div>

    <div ref="alignHorizontally">
      <FunctionButton
        :title="alignNodesHorizontallyTitle"
        :disabled="!canAlignNodes"
        data-test-id="node-selection-tool-align-horizontally"
        @pointerdown="$shortcuts.dispatch(alignHorizontallyShortcut.name)"
      >
        <NodesAlignHorizIcon />
      </FunctionButton>
    </div>

    <div ref="alignVertically">
      <FunctionButton
        :title="alignNodesVerticallyTitle"
        :disabled="!canAlignNodes"
        data-test-id="node-selection-tool-align-vertically"
        @pointerdown="$shortcuts.dispatch(alignVerticallyShortcut.name)"
      >
        <NodesAlignVertIcon />
      </FunctionButton>
    </div>
  </FloatingToolbar>
</template>
