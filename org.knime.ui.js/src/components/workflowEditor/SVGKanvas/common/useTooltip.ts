import { type ComputedRef, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";

import type { TooltipDefinition } from "@/components/workflowEditor/types";
import { useWorkflowStore } from "@/store/workflow/workflow";

export const entryDelay = 750;

export const useTooltip = (params: {
  tooltip: ComputedRef<TooltipDefinition | null>;
}) => {
  const elemRef = ref<HTMLElement | null>(null);
  const workflowStore = useWorkflowStore();
  const { tooltip } = storeToRefs(workflowStore);

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
    // add watcher to component's "tooltip" property
    const removeWatcher = watch(
      params.tooltip,
      (value) => {
        workflowStore.setTooltip(value);
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
    tooltipTimeout = window.setTimeout(showTooltip, entryDelay);
  };

  const onTooltipMouseLeave = (event: MouseEvent) => {
    const relatedTarget = event.relatedTarget as HTMLElement;
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

    if (params.tooltip.value?.hoverable) {
      const tooltipContainer = document.getElementById("tooltip-container");

      if (tooltipContainer && tooltipContainer.contains(relatedTarget)) {
        // abort removing tooltip
        return;
      }
    }
    // remove tooltip
    workflowStore.setTooltip(null);
    // NOTE: watcher will be removed by watch of workflow.tooltip
  };

  onMounted(() => {
    if (!elemRef.value) {
      return;
    }

    elemRef.value.addEventListener("mouseenter", onTooltipMouseEnter);
    elemRef.value.addEventListener("mouseleave", onTooltipMouseLeave);
  });

  onBeforeUnmount(() => {
    if (!elemRef.value) {
      return;
    }

    elemRef.value.removeEventListener("mouseenter", onTooltipMouseEnter);
    elemRef.value.removeEventListener("mouseleave", onTooltipMouseLeave);

    if (removeTooltipWatcher) {
      workflowStore.setTooltip(null);
    }
  });

  return { elemRef };
};
