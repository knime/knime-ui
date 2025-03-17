import { ref } from "vue";
import { storeToRefs } from "pinia";
import * as PIXI from "pixi.js";

import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useSelectionStore } from "@/store/selection";
import { useMovingStore } from "@/store/workflow/moving";
import * as $shapes from "@/style/shapes";
import { isMultiselectEvent } from "../../util/isMultiselectEvent";

const MIN_MOVE_THRESHOLD = $shapes.gridSize.x;

type UseMoveOrSelectObjectOptions = {
  isObjectSelected: () => boolean;
  selectObject: () => void;
  deselectObject: () => void;
  onMoveEnd?: () => Promise<boolean>;
};

export const useMoveOrSelectObject = (
  options: UseMoveOrSelectObjectOptions,
) => {
  const {
    isObjectSelected,
    selectObject,
    deselectObject,
    onMoveEnd = () => Promise.resolve(true),
  } = options;

  const selectionStore = useSelectionStore();
  const movingStore = useMovingStore();

  const { zoomFactor, pixiApplication } = storeToRefs(useWebGLCanvasStore());

  const startPos = ref<{ x: number; y: number }>({ x: 0, y: 0 });

  const onPointerDown = (pointerDownEvent: PIXI.FederatedPointerEvent) => {
    if (pointerDownEvent.button !== 0) {
      return;
    }

    const canvas = pixiApplication.value!.canvas;
    canvas.setPointerCapture(pointerDownEvent.pointerId);

    startPos.value = {
      x: pointerDownEvent.global.x,
      y: pointerDownEvent.global.y,
    };

    const isMultiselect = isMultiselectEvent(pointerDownEvent);

    if (!isObjectSelected() && !isMultiselect) {
      selectionStore.deselectAllObjects();
      selectObject();
    }

    if (isMultiselect) {
      if (isObjectSelected()) {
        deselectObject();
      } else {
        selectObject();
      }
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
        if (!isMultiselect && isObjectSelected()) {
          selectionStore.deselectAllObjects();
        }
        selectObject();
      }

      onMoveEnd().then((shouldMove) => {
        if (shouldMove) {
          movingStore.moveObjects();
        }
      });
      canvas.releasePointerCapture(pointerDownEvent.pointerId);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
    };

    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
  };

  return { moveOrSelect: onPointerDown };
};
