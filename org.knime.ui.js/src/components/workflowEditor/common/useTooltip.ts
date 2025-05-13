/* eslint-disable no-undefined */
import {
  type ComputedRef,
  type Ref,
  onBeforeUnmount,
  onMounted,
  watch,
} from "vue";
import { storeToRefs } from "pinia";

import type { TooltipDefinition } from "@/components/workflowEditor/types";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useMovingStore } from "@/store/workflow/moving";
import { useWorkflowStore } from "@/store/workflow/workflow";
import type { ContainerInst } from "@/vue3-pixi";
import { canvasRendererUtils } from "../util/canvasRenderer";

export const entryDelayMS = 750;
export const leaveDelayMS = 550;

export const useTooltip = (params: {
  tooltip: ComputedRef<TooltipDefinition | null>;
  element: Ref<Element | ContainerInst | null>;
}) => {
  const workflowStore = useWorkflowStore();
  const { tooltip } = storeToRefs(workflowStore);
  const { isDragging } = storeToRefs(useMovingStore());

  let removeTooltipWatcher: (() => void) | null;
  // eslint-disable-next-line one-var
  let tooltipTimeout: number, hideOnMouseoutTimeout: number;

  // takes care of removing the tooltip watcher even if the tooltip got closed from any other component (set null)
  watch(tooltip, (value) => {
    if (value === null) {
      removeTooltipWatcher?.();
    }
  });

  const getAutoAnchorPoint = (
    anchorPoint: { x: number; y: number } | undefined,
    orientation: "top" | "bottom" = "top",
  ) => {
    if (anchorPoint) {
      return anchorPoint;
    }

    const isPixiContainer = (
      value: Element | ContainerInst,
    ): value is ContainerInst => Boolean((value as ContainerInst).getBounds);

    if (params.element.value && isPixiContainer(params.element.value)) {
      const elemBounds = params.element.value.getBounds();
      const [canvasX, canvasY] = useWebGLCanvasStore().toCanvasCoordinates([
        elemBounds.x,
        elemBounds.y + (orientation === "bottom" ? elemBounds.height : 0),
      ]);
      return {
        x: canvasX,
        y: canvasY,
      };
    }
    return undefined;
  };

  const showTooltip = () => {
    if (isDragging.value) {
      return;
    }

    // add watcher to component's "tooltip" property
    const removeWatcher = watch(
      params.tooltip,
      (value) => {
        // automatically set the anchor point to our element
        const anchorPoint = getAutoAnchorPoint(
          value?.anchorPoint,
          value?.orientation,
        );
        if (!anchorPoint) {
          return;
        }
        workflowStore.setTooltip(
          value === null ? null : { ...value, anchorPoint },
        );
      },
      { immediate: true },
    );
    // provide method to remove the "tooltip" watcher
    removeTooltipWatcher = () => {
      removeWatcher();
      removeTooltipWatcher = null;
    };
  };

  const onTooltipMouseEnter = () => {
    removeTooltipWatcher?.();
    if (!params.tooltip) {
      consola.error(
        "Tooltip cannot be used without providing a tooltip property",
      );
      return;
    }

    // wait for entryDelay to set tooltip
    tooltipTimeout = window.setTimeout(showTooltip, entryDelayMS);
  };

  const handleWebGlHoverableLeave = () => {
    if (hideOnMouseoutTimeout) {
      clearTimeout(hideOnMouseoutTimeout);
    }
    // give the use some time to move to the tooltip
    hideOnMouseoutTimeout = window.setTimeout(() => {
      // check if current mouse position is on tooltip
      if (
        !Array.from(document.querySelectorAll(":hover")).some(
          (el) => (el as HTMLElement).dataset?.isTooltip,
        )
      ) {
        workflowStore.setTooltip(null);
      }
    }, leaveDelayMS);
  };

  const onTooltipMouseLeave = (event: any) => {
    const relatedTarget = event.relatedTarget as HTMLElement | null;
    consola.trace(
      "mouse left to:",
      relatedTarget?.tagName,
      relatedTarget?.id,
      relatedTarget?.classList,
    );
    // if the tooltip hasn't been opened yet, cancel timer and return
    if (!removeTooltipWatcher) {
      clearTimeout(tooltipTimeout);
      return;
    }

    if (!params.tooltip.value?.hoverable) {
      // remove tooltip
      workflowStore.setTooltip(null);
      // NOTE: watcher will be removed by watch of workflow.tooltip
      return;
    }

    // -- hoverable handling

    // webgl events do not have a relatedTarget use custom handling
    if (canvasRendererUtils.isWebGLRenderer()) {
      handleWebGlHoverableLeave();
      return;
    }

    // svg: remove tooltip if user did not switch to the tooltip with the mouse
    const tooltipContainer = document.getElementById("tooltip-container");
    if (!tooltipContainer?.contains(relatedTarget)) {
      workflowStore.setTooltip(null);
    }
  };

  onMounted(() => {
    if (!params.element.value) {
      return;
    }

    params.element.value.addEventListener("mouseenter", onTooltipMouseEnter);
    params.element.value.addEventListener("mouseleave", onTooltipMouseLeave);
  });

  onBeforeUnmount(() => {
    if (!params.element.value) {
      return;
    }

    params.element.value.removeEventListener("mouseenter", onTooltipMouseEnter);
    params.element.value.removeEventListener("mouseleave", onTooltipMouseLeave);

    if (removeTooltipWatcher) {
      workflowStore.setTooltip(null);
    }
  });
};
