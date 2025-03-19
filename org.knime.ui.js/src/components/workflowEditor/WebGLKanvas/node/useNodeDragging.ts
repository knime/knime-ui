import { ref, watch } from "vue";
import type { Ref } from "vue";
import { storeToRefs } from "pinia";
import * as PIXI from "pixi.js";

import type { XY } from "@/api/gateway-api/generated-api";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useSelectionStore } from "@/store/selection";
import { useMovingStore } from "@/store/workflow/moving";
import { usePointerDownDoubleClick } from "../common/usePointerDownDoubleClick";

const MIN_MOVE_THRESHOLD = 5;

type UseNodeDraggingOptions = {
  nodeId: string;
  onDoubleClick: (event: PointerEvent) => void;
  position: Ref<XY>;
};

export const useNodeDragging = (options: UseNodeDraggingOptions) => {
  const selectionStore = useSelectionStore();
  const { isNodeSelected } = storeToRefs(selectionStore);
  const movingStore = useMovingStore();
  const { isDragging } = storeToRefs(movingStore);

  const { pointerDownDoubleClick } = usePointerDownDoubleClick({
    handler: options.onDoubleClick,
  });

  const { zoomFactor, pixiApplication } = storeToRefs(useWebGLCanvasStore());

  const startPos = ref<{ x: number; y: number }>({ x: 0, y: 0 });

  // reset the drag state on position updates (this is what the backend patches via workflow updates)
  watch(
    options.position,
    () => {
      if (isDragging.value) {
        movingStore.resetDragState();
      }
    },
    { deep: true },
  );

  const onPointerDown = (pointerDownEvent: PIXI.FederatedPointerEvent) => {
    if (pointerDownEvent.button !== 0) {
      return;
    }

    // check for double clicks
    if (pointerDownDoubleClick(pointerDownEvent)) {
      return;
    }

    const canvas = pixiApplication.value!.canvas;
    canvas.setPointerCapture(pointerDownEvent.pointerId);

    startPos.value = {
      x: pointerDownEvent.global.x,
      y: pointerDownEvent.global.y,
    };

    const isMultiselect =
      pointerDownEvent.shiftKey ||
      pointerDownEvent.ctrlKey ||
      pointerDownEvent.metaKey;

    if (!isNodeSelected.value(options.nodeId) && !isMultiselect) {
      selectionStore.deselectAllObjects();
      selectionStore.selectNode(options.nodeId);
    }
    if (isMultiselect) {
      if (isNodeSelected.value(options.nodeId)) {
        selectionStore.deselectNode(options.nodeId);
      } else {
        selectionStore.selectNode(options.nodeId);
      }
      // forbid move on multi select
      return;
    }

    let didDrag = false;

    const onMove = (pointerMoveEvent: PointerEvent): void => {
      const deltaX =
        (pointerMoveEvent.offsetX - startPos.value.x) / zoomFactor.value;
      const deltaY =
        (pointerMoveEvent.offsetY - startPos.value.y) / zoomFactor.value;

      if (
        Math.abs(deltaX) >= MIN_MOVE_THRESHOLD ||
        Math.abs(deltaY) >= MIN_MOVE_THRESHOLD
      ) {
        didDrag = true;
      }

      movingStore.setIsDragging(true);
      movingStore.setMovePreview({ deltaX, deltaY });
    };

    const onUp = () => {
      if (!didDrag) {
        if (!isMultiselect && isNodeSelected.value(options.nodeId)) {
          selectionStore.deselectAllObjects();
        }
        selectionStore.selectNode(options.nodeId);
      }

      movingStore.moveObjects();
      canvas.releasePointerCapture(pointerDownEvent.pointerId);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
    };

    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
  };

  return { startDrag: onPointerDown };
};
