import { type Ref, computed } from "vue";
import { type Fn, useEventListener } from "@vueuse/core";

import { navigatorUtils } from "@knime/utils";

import { useStore } from "@/composables/useStore";
import { gridSize } from "@/style/shapes";

type UseArrowKeyMovingOptions = {
  rootEl: Ref<HTMLElement>;
};

export const useArrowKeyMoving = (options: UseArrowKeyMovingOptions) => {
  const store = useStore();
  const isDragging = computed(() => store.state.workflow.isDragging);
  const isWritable = computed(() => store.getters["workflow/isWritable"]);

  let cleanupKeyupHandler: Fn | null = null;

  const doMove = async (event: KeyboardEvent) => {
    const modifiers = [navigatorUtils.isMac() ? "Meta" : "Control", "Shift"];
    if (modifiers.includes(event.key)) {
      await store.dispatch("workflow/moveObjects");
      if (cleanupKeyupHandler !== null) {
        cleanupKeyupHandler();
        cleanupKeyupHandler = null;
      }
    }
  };

  const handleMovement = (event: KeyboardEvent) => {
    if (!isWritable.value) {
      return;
    }

    store.commit("workflow/setTooltip", null);

    const deltaY = {
      ArrowUp: -gridSize.y,
      ArrowDown: gridSize.y,
    }[event.key];

    const deltaX = {
      ArrowLeft: -gridSize.x,
      ArrowRight: gridSize.x,
    }[event.key];

    if (!isDragging.value) {
      store.commit("workflow/setIsDragging", true);
    }

    const { x = 0, y = 0 } = store.state.workflow.movePreviewDelta;

    store.commit("workflow/setMovePreview", {
      deltaX: (deltaX ?? 0) + x,
      deltaY: (deltaY ?? 0) + y,
    });

    if (!cleanupKeyupHandler) {
      cleanupKeyupHandler = useEventListener(options.rootEl, "keyup", doMove);
    }
  };

  return { handleMovement };
};
