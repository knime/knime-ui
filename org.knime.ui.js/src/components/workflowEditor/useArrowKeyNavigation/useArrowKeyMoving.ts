import { type Ref, ref } from "vue";
import { type Fn, useEventListener } from "@vueuse/core";
import { storeToRefs } from "pinia";

import { navigatorUtils } from "@knime/utils";

import type { XY } from "@/api/gateway-api/generated-api";
import { useSelectionStore } from "@/store/selection";
import { useMovingStore } from "@/store/workflow/moving";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { gridSize } from "@/style/shapes";
import { useCanvasRendererUtils } from "../util/canvasRenderer";

type UseArrowKeyMovingOptions = {
  rootEl: Ref<HTMLElement>;
};

export const useArrowKeyMoving = (options: UseArrowKeyMovingOptions) => {
  const hasMoved = ref(false);
  const appliedDelta = ref<XY>({ x: 0, y: 0 });
  const movingStore = useMovingStore();
  const { isDragging, movePreviewDelta } = storeToRefs(movingStore);

  const workflowStore = useWorkflowStore();
  const { isWritable } = storeToRefs(workflowStore);
  const { selectedNodeIds } = storeToRefs(useSelectionStore());
  const nodeInteractionStore = useNodeInteractionsStore();
  const { isWebGLRenderer } = useCanvasRendererUtils();

  let cleanupKeyupHandler: Fn | null = null;

  const doMove = async (event: KeyboardEvent) => {
    if (hasMoved.value) {
      return;
    }

    const modifiers = [navigatorUtils.isMac() ? "Meta" : "Control", "Shift"];
    if (modifiers.includes(event.key)) {
      hasMoved.value = true;

      if (isWebGLRenderer.value) {
        await movingStore.moveObjectsWebGL(appliedDelta.value);
      } else {
        await movingStore.moveObjects();
      }

      appliedDelta.value = { x: 0, y: 0 };
      hasMoved.value = false;

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

    if (isWebGLRenderer.value) {
      appliedDelta.value.x += deltaX ?? 0;
      appliedDelta.value.y += deltaY ?? 0;

      for (const nodeId of selectedNodeIds.value) {
        nodeInteractionStore.updatePosition(
          nodeId,
          { x: deltaX ?? 0, y: deltaY ?? 0 },
          "add",
        );
      }
    } else {
      const { x = 0, y = 0 } = movePreviewDelta.value;

      movingStore.setMovePreview({
        deltaX: (deltaX ?? 0) + x,
        deltaY: (deltaY ?? 0) + y,
      });
    }

    if (!cleanupKeyupHandler) {
      cleanupKeyupHandler = useEventListener(options.rootEl, "keyup", doMove);
    }
  };

  return { handleMovement };
};
