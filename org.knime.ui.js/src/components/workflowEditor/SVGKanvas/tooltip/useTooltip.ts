import {
  type ComputedRef,
  type Ref,
  onBeforeUnmount,
  onMounted,
  watch,
} from "vue";
import { storeToRefs } from "pinia";
import type { Container } from "pixi.js";

import type { TooltipDefinition } from "@/components/workflowEditor/types";
import { useMovingStore } from "@/store/workflow/moving";
import { useWorkflowStore } from "@/store/workflow/workflow";

export const entryDelayMS = 750;
export const leaveDelayMS = 550;

export const useTooltip = (params: {
  tooltip: ComputedRef<TooltipDefinition | null>;
  element: Ref<Element | Container | null>;
}) => {
  const workflowStore = useWorkflowStore();
  const { tooltip } = storeToRefs(workflowStore);
  const { isDragging } = storeToRefs(useMovingStore());

  let removeTooltipWatcher: (() => void) | null;
  // eslint-disable-next-line one-var
  let tooltipTimeout: number;

  // takes care of removing the tooltip watcher even if the tooltip got closed from any other component (set null)
  watch(tooltip, (value) => {
    if (value === null) {
      removeTooltipWatcher?.();
    }
  });

  const showTooltip = () => {
    if (isDragging.value) {
      return;
    }

    // add watcher to component's "tooltip" property
    const removeWatcher = watch(
      params.tooltip,
      (value) => {
        if (!value?.anchorPoint) {
          return;
        }
        workflowStore.setTooltip(value === null ? null : { ...value });
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
    // remove tooltip if user did not switch to the tooltip with the mouse
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
