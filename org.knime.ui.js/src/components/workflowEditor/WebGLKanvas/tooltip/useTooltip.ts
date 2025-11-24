import { type ComputedRef, type Ref } from "vue";
import { storeToRefs } from "pinia";

import type { TooltipDefinition } from "@/components/workflowEditor/types";
import { useCanvasTooltipStore } from "@/store/canvasTooltip/canvasTooltip";
import { useMovingStore } from "@/store/workflow/moving";
import type { Container } from "pixi.js";

const entryDelayMS = 750;
const hoverableTooltipLeaveDelayMS = 550;

export const useTooltip = (params: {
  tooltip: ComputedRef<TooltipDefinition | null>;
  element: Ref<Container | null>;
}) => {
  const canvasTooltipStore = useCanvasTooltipStore();
  const { isDragging } = storeToRefs(useMovingStore());

  let showTimeout: number, hoverableTooltipHideTimeout: number;

  const showTooltip = () => {
    if (canvasTooltipStore.isHoverableTooltipHovered || isDragging.value) {
      return;
    }

    clearTimeout(showTimeout);

    // wait for entryDelay to set tooltip
    showTimeout = window.setTimeout(() => {
      canvasTooltipStore.showTooltip(params.element, params.tooltip);
    }, entryDelayMS);
  };

  const hideTooltip = () => {
    if (canvasTooltipStore.isHoverableTooltipHovered) {
      return;
    }

    clearTimeout(showTimeout);
    clearTimeout(hoverableTooltipHideTimeout);

    // Immediately close non-hoverable tooltips
    if (!params.tooltip.value?.hoverable) {
      canvasTooltipStore.hideTooltip();
    }

    // Give the user some time to move to the hoverable tooltip before hiding it
    hoverableTooltipHideTimeout = window.setTimeout(() => {
      if (
        !Array.from(document.querySelectorAll(":hover")).some(
          (el) => (el as HTMLElement).dataset?.isTooltip,
        )
      ) {
        canvasTooltipStore.hideTooltip();
      }
    }, hoverableTooltipLeaveDelayMS);
  };

  return { showTooltip, hideTooltip };
};
