import {
  type ComputedRef,
  type ShallowRef,
  computed,
  readonly,
  ref,
  shallowRef,
} from "vue";

import type { TooltipDefinition } from "@/components/workflowEditor/types";
import type { ContainerInst } from "@/vue3-pixi";

const __config = shallowRef<ComputedRef<TooltipDefinition | null>>();
const __element = shallowRef<ShallowRef<ContainerInst | null>>();

const isShown = ref(false);
const isHoverableTooltipHovered = ref(false);

/**
 * Internal shared state for Tooltip.vue and useTooltip
 */
export const useTooltipState = () => {
  const show = (
    element: ShallowRef<ContainerInst | null>,
    config: ComputedRef<TooltipDefinition | null>,
  ) => {
    if (!config.value || !element.value) {
      consola.debug(
        "useTooltipState: show called with nullish params ignoring",
      );
      return;
    }

    __config.value = config;
    __element.value = element;
    isShown.value = true;
  };

  const hide = () => {
    isShown.value = false;
    isHoverableTooltipHovered.value = false;
    __config.value = undefined;
    __element.value = undefined;
  };

  return {
    isShown: readonly(isShown),
    show,
    hide,
    element: computed(() => __element.value?.value),
    config: computed(() => __config.value?.value),
    isHoverableTooltipHovered,
  };
};
