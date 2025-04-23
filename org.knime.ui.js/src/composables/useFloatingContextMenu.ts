import { type Ref, computed, ref, watch } from "vue";
import { autoUpdate, offset, useFloating } from "@floating-ui/vue";

import type { XY } from "@/api/gateway-api/generated-api";

type UseFloatingContextMenuOptions = {
  anchorElement: Ref<HTMLElement>;
  menuElement: Ref<HTMLElement>;
};

export const useFloatingContextMenu = (
  options: UseFloatingContextMenuOptions,
) => {
  const menuPosition = ref<XY | null>(null);
  const { anchorElement, menuElement } = options;

  const displayMenu = (position: XY) => {
    menuPosition.value = position;
  };

  const hideMenu = () => {
    menuPosition.value = null;
  };

  const offsetX = computed(() => {
    if (!menuPosition.value || !anchorElement.value) {
      return 0;
    }

    const referenceRect = anchorElement.value.getBoundingClientRect();
    return menuPosition.value.x - referenceRect.left;
  });

  const offsetY = computed(() => {
    if (!menuPosition.value || !anchorElement.value) {
      return 0;
    }

    const referenceRect = anchorElement.value.getBoundingClientRect();
    return menuPosition.value.y - referenceRect.bottom;
  });

  const middleware = computed(() => [
    offset({ mainAxis: offsetY.value, crossAxis: offsetX.value }),
  ]);

  const { floatingStyles, update: updateFloating } = useFloating(
    anchorElement,
    menuElement,
    {
      placement: "bottom-start",
      strategy: "fixed",
      middleware,
      whileElementsMounted: autoUpdate,
    },
  );

  watch(menuPosition, () => updateFloating(), { deep: true });

  return {
    menuPosition: computed(() => menuPosition.value),
    floatingStyles,
    displayMenu,
    hideMenu,
  };
};
