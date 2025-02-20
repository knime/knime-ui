import { type Ref } from "vue";
import { type Fn, useEventListener } from "@vueuse/core";
import { storeToRefs } from "pinia";

import { navigatorUtils } from "@knime/utils";

import { useMovingStore } from "@/store/workflow/moving";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { gridSize } from "@/style/shapes";

type UseArrowKeyMovingOptions = {
  rootEl: Ref<HTMLElement>;
};

export const useArrowKeyMoving = (options: UseArrowKeyMovingOptions) => {
  const movingStore = useMovingStore();
  const { isDragging, movePreviewDelta } = storeToRefs(movingStore);

  const workflowStore = useWorkflowStore();
  const { isWritable } = storeToRefs(workflowStore);

  let cleanupKeyupHandler: Fn | null = null;

  const doMove = async (event: KeyboardEvent) => {
    const modifiers = [navigatorUtils.isMac() ? "Meta" : "Control", "Shift"];
    if (modifiers.includes(event.key)) {
      await movingStore.moveObjects();
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

    workflowStore.setTooltip(null);

    const deltaY = {
      ArrowUp: -gridSize.y,
      ArrowDown: gridSize.y,
    }[event.key];

    const deltaX = {
      ArrowLeft: -gridSize.x,
      ArrowRight: gridSize.x,
    }[event.key];

    if (!isDragging.value) {
      movingStore.setIsDragging(true);
    }

    const { x = 0, y = 0 } = movePreviewDelta.value;

    movingStore.setMovePreview({
      deltaX: (deltaX ?? 0) + x,
      deltaY: (deltaY ?? 0) + y,
    });

    if (!cleanupKeyupHandler) {
      cleanupKeyupHandler = useEventListener(options.rootEl, "keyup", doMove);
    }
  };

  return { handleMovement };
};
