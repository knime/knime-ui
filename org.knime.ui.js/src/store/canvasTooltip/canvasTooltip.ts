import { type ComputedRef, type Ref, ref } from "vue";
import { defineStore } from "pinia";

import type { TooltipDefinition } from "@/components/workflowEditor/types";
import type { Container } from "pixi.js";

export const useCanvasTooltipStore = defineStore("canvasTooltip", () => {
  const tooltip = ref<{
    element: Container;
    config: TooltipDefinition;
  } | null>(null);

  // Pointer events for canvas elements get triggered even if they are below
  // the tooltip, hiding the hoverable tooltip. This flag is used to make sure
  // that hovered hoverable tooltip stays open until the pointer leaves it
  const isHoverableTooltipHovered = ref(false);

  const showTooltip = (
    element: Ref<Container | null>,
    config: ComputedRef<TooltipDefinition | null>,
  ) => {
    if (element.value === null || config.value === null) {
      return;
    }
    tooltip.value = { element: element.value, config: config.value };
  };

  const hideTooltip = () => {
    tooltip.value = null;
  };

  return {
    tooltip,
    isHoverableTooltipHovered,
    showTooltip,
    hideTooltip,
  };
});
