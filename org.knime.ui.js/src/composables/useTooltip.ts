import {
  watch,
  type Ref,
  onMounted,
  onBeforeUnmount,
  ref,
  type ComputedRef,
} from "vue";
import { useStore } from "vuex";

export const entryDelay = 750;

export interface TooltipDefinition {
  position: {
    x: number;
    y: number;
  };
  gap: number;
  anchorPoint: { x: number; y: number };
  text: string;
  title?: string;
  type?: "error" | "warning" | "default";
  orientation?: "top" | "bottom";
  hoverable?: boolean;
}

export const useTooltip = (params: {
  tooltip: ComputedRef<TooltipDefinition>;
}) => {
  const elemRef: Ref<HTMLElement> = ref(null);
  const store = useStore();
  let removeTooltipWatcher: () => void | null;
  let tooltipTimeout = null;

  // takes care of removing the tooltip watcher even if the tooltip got closed from any other component (set null)
  store.watch(
    (state) => state.workflow.tooltip,
    (value) => {
      if (value === null) {
        removeTooltipWatcher?.();
      }
    },
  );

  const showTooltip = () => {
    // add watcher to component's "tooltip" property
    const removeWatcher = watch(
      params.tooltip,
      (value) => {
        store.commit("workflow/setTooltip", value);
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
    tooltipTimeout = setTimeout(showTooltip, entryDelay);
  };

  const onTooltipMouseLeave = (event: MouseEvent) => {
    const relatedTarget = event.target as HTMLElement;
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
    if (params.tooltip?.value.hoverable) {
      const tooltipContainer = document.getElementById("tooltip-container");
      if (tooltipContainer && tooltipContainer.contains(relatedTarget)) {
        // abort removing tooltip
        return;
      }
    }
    // remove tooltip
    store.commit("workflow/setTooltip", null);
    // NOTE: watcher will be removed by watch of $store.state.workflow.tooltip
  };

  onMounted(() => {
    elemRef.value.addEventListener("mouseenter", onTooltipMouseEnter);
    elemRef.value.addEventListener("mouseleave", onTooltipMouseLeave);
  });

  onBeforeUnmount(() => {
    elemRef.value.removeEventListener("mouseenter", onTooltipMouseEnter);
    elemRef.value.removeEventListener("mouseleave", onTooltipMouseLeave);
    if (removeTooltipWatcher) {
      store.commit("workflow/setTooltip", null);
    }
  });

  return { elemRef };
};
