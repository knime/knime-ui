import { type ComputedRef, type Ref } from "vue";
import { storeToRefs } from "pinia";

import type { TooltipDefinition } from "@/components/workflowEditor/types";
import { useMovingStore } from "@/store/workflow/moving";
import type { ContainerInst } from "@/vue3-pixi";

import { useTooltipState } from "./useTooltipState";

const entryDelayMS = 750;
const hoverableTooltipLeaveDelayMS = 550;

export const useTooltip = (params: {
  config: ComputedRef<TooltipDefinition | null>;
  element: Ref<ContainerInst | null>;
}) => {
  const { isDragging } = storeToRefs(useMovingStore());
  const { isHoverableTooltipHovered, show, hide } = useTooltipState();

  let showTimeout: number, hoverableTooltipHideTimeout: number;

  const showTooltip = () => {
    if (isHoverableTooltipHovered.value || isDragging.value) {
      return;
    }

    clearTimeout(showTimeout);

    // wait for entryDelay to set tooltip
    showTimeout = window.setTimeout(() => {
      show(params.element, params.config);
    }, entryDelayMS);
  };

  const hideTooltip = () => {
    if (isHoverableTooltipHovered.value) {
      return;
    }

    clearTimeout(showTimeout);
    clearTimeout(hoverableTooltipHideTimeout);

    // Immediately close non-hoverable tooltips
    if (!params.config.value?.hoverable) {
      hide();
    }

    // Give the user some time to move to the hoverable tooltip before hiding it
    hoverableTooltipHideTimeout = window.setTimeout(() => {
      if (
        !Array.from(document.querySelectorAll(":hover")).some(
          (el) => (el as HTMLElement).dataset?.isTooltip,
        )
      ) {
        hide();
      }
    }, hoverableTooltipLeaveDelayMS);
  };

  return { showTooltip, hideTooltip };
};
