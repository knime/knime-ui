import { ref } from "vue";
import { storeToRefs } from "pinia";
import * as PIXI from "pixi.js";

import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useSelectionStore } from "@/store/selection";
import { useMovingStore } from "@/store/workflow/moving";
import * as $shapes from "@/style/shapes";
import { isMultiselectEvent } from "../../util/isMultiselectEvent";
import { markEventAsHandled } from "../util/interaction";

import { usePointerDownDoubleClick } from "./usePointerDownDoubleClick";

const MIN_MOVE_THRESHOLD = $shapes.gridSize.x;

type UseObjectInteractionsOptions = {
  isObjectSelected: () => boolean;
  selectObject: () => void;
  deselectObject: () => void;
  onMoveEnd?: () => Promise<boolean>;
  onDoubleClick?: (event: PointerEvent) => void;
};

/**
 * This composable handles 3 key interactions that are initiated
 * from a PointerDown event:
 *
 * - **Drag & Drop**:
 *    Only fired when the user continues to move the pointer
 *    without releasing (not firing a pointerup)and also when the distance
 *    moved surpasses a defined threshold
 *
 * - **Selection/Deselection**:
 *    Fired when the user triggers a pointerdown, followed by a poinerup. If a
 *    small (insignificant) move is made in between this is discarded and not
 *    treated as a drag.
 *
 * - **Double click**:
 *    NOTE: this behavior is only handled when the `onDoubleClick` is supplied.
 *    Fired when the user consecutively fires 2 pointerdowns in quick succession.
 *    An interaction is deemed a "double-click" when the time delta between the 2
 *    pointerdown events is of 200 ms or less. Do note that the 1st pointerdown *will*
 *    fire the selection logic but the second one won't since that will be treated
 *    as the double click and will thus execute the provided callback.
 *
 */
export const useObjectInteractions = (
  options: UseObjectInteractionsOptions,
) => {
  const {
    isObjectSelected,
    selectObject,
    deselectObject,
    onMoveEnd = () => Promise.resolve(true),
  } = options;

  const selectionStore = useSelectionStore();
  const movingStore = useMovingStore();

  const { isPointerDownDoubleClick } = usePointerDownDoubleClick();

  const { zoomFactor, pixiApplication } = storeToRefs(useWebGLCanvasStore());

  const startPos = ref<{ x: number; y: number }>({ x: 0, y: 0 });

  const onPointerDown = (pointerDownEvent: PIXI.FederatedPointerEvent) => {
    // shift acts as a way to lock interactions and only do global selection
    if (pointerDownEvent.button !== 0) {
      return;
    }

    consola.debug("object interaction", { pointerDownEvent });
    markEventAsHandled(pointerDownEvent, { initiator: "object-interaction" });

    // check for double clicks
    if (options.onDoubleClick && isPointerDownDoubleClick(pointerDownEvent)) {
      options.onDoubleClick(pointerDownEvent);
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
      const action = isObjectSelected() ? deselectObject : selectObject;
      action();

      // forbid move on multi select
      return;
    }

    let didDrag = false;

    const onMove = (pointerMoveEvent: PointerEvent): void => {
      const deltaX =
        (pointerMoveEvent.offsetX - startPos.value.x) / zoomFactor.value;
      const deltaY =
        (pointerMoveEvent.offsetY - startPos.value.y) / zoomFactor.value;

      const isSignificantMove =
        Math.abs(deltaX) >= MIN_MOVE_THRESHOLD ||
        Math.abs(deltaY) >= MIN_MOVE_THRESHOLD;

      if (!isSignificantMove) {
        return;
      }

      didDrag = true;
      movingStore.setIsDragging(true);
      movingStore.setMovePreview({ deltaX, deltaY });
    };

    const onUp = () => {
      onMoveEnd().then((shouldMove) => {
        if (shouldMove && didDrag) {
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

  return { handlePointerInteraction: onPointerDown };
};
