import { computed } from "vue";
import { storeToRefs } from "pinia";
import * as PIXI from "pixi.js";

import { useCanvasModesStore } from "@/store/application/canvasModes";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useMovingStore } from "@/store/workflow/moving";
import { usePointerDownDoubleClick } from "../usePointerDownDoubleClick";

import { useHandlePointerInteraction } from "./_internalHandleDefaultPointerInteraction";
import { useHandleUnselectedAnnotation } from "./_internalHandleUnselectedAnnotation";
import { useObjectHandler } from "./_internalUseObjectSelectionHandler";
import type { ObjectMetadata } from "./types";

type UseObjectInteractionsOptions = {
  objectMetadata: ObjectMetadata;
  /**
   * Optional handler to run when the move interaction starts
   */
  onMoveStart?: () => void;
  /**
   * Optional handler to run when the move interaction is happening
   */
  onMove?: (event: PointerEvent) => void;
  /**
   * Optional handler to run when the move interaction finishes
   */
  onMoveEnd?: () => Promise<{ shouldMove: boolean }>;
  /**
   * Optional handler to run when the user fires off a double click
   */
  onDoubleClick?: (event: PointerEvent) => void;
  /**
   * Optional handler to run when the object is selected
   */
  onSelect?: () => void;
};

/**
 * This composable handles 3 key interactions that are initiated
 * from a PointerDown event:
 *
 * - **Selection/Deselection**:
 *    This is the very first interaction, which is fired immediately as soon as
 *    the user triggers a pointerdown. The object will be selected/deselected
 *    depending on its current state and also depending on the modifiers used on
 *    on the event (e.g multi-selection).
 *
 * - **Drag & Drop**:
 *    Only fired when the user continues to move the pointer
 *    without releasing (not firing a pointerup) and also when the distance
 *    moved surpasses a pre-defined threshold. However, it's important to note that
 *    a move will not occur if, upon selection, there are pending changes that
 *    could prevent the user from proceeding (e.g., unsaved configurations).
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
  const { objectMetadata } = options;

  const movingStore = useMovingStore();
  const { dragInitiatorId } = storeToRefs(movingStore);

  const canvasStore = useWebGLCanvasStore();
  const { isHoldingDownSpace } = storeToRefs(canvasStore);
  const objectHandler = useObjectHandler(objectMetadata);

  const { isPointerDownDoubleClick } = usePointerDownDoubleClick();
  const { handleDefaultInteraction } = useHandlePointerInteraction({
    ...options,
    isDoubleClick: isPointerDownDoubleClick,
  });
  const { handleUnselectedAnnotation } = useHandleUnselectedAnnotation({
    ...options,
    isDoubleClick: isPointerDownDoubleClick,
  });

  const onPointerDown = async (
    pointerDownEvent: PIXI.FederatedPointerEvent,
  ) => {
    if (useCanvasModesStore().hasPanModeEnabled) {
      return;
    }

    const isMouseLeftClick = pointerDownEvent.button === 0;
    if ((isMouseLeftClick && isHoldingDownSpace.value) || !isMouseLeftClick) {
      return;
    }

    const isAnnotation = options.objectMetadata.type === "annotation";

    // handle annotations differently only when they're not selected
    if (isAnnotation && !objectHandler.isObjectSelected()) {
      handleUnselectedAnnotation(pointerDownEvent);
      return;
    }

    await handleDefaultInteraction(pointerDownEvent);
  };

  return {
    handlePointerInteraction: onPointerDown,
    isDraggingThisObject: computed(
      () => objectHandler.getObjectId() === dragInitiatorId.value,
    ),
  };
};
