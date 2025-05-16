/* eslint-disable no-undefined */
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import * as PIXI from "pixi.js";

import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useSelectionStore } from "@/store/selection";
import { useMovingStore } from "@/store/workflow/moving";
import { useWorkflowStore } from "@/store/workflow/workflow";
import * as $shapes from "@/style/shapes";
import { isMultiselectEvent } from "../../util/isMultiselectEvent";
import { markEventAsHandled } from "../util/interaction";

import { usePointerDownDoubleClick } from "./usePointerDownDoubleClick";

const MIN_MOVE_THRESHOLD = $shapes.gridSize.x;

type UseObjectInteractionsOptions = {
  /**
   * The id of the object for the interaction
   */
  objectId: string;
  /**
   * A function that checks if the object is selected
   */
  isObjectSelected: () => boolean;
  /**
   * A function to perform a selection for this object
   */
  selectObject: () => Promise<void>;
  /**
   * A function to perform a deselection for this object
   */
  deselectObject: () => Promise<void>;
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
   * Annotations are handled slighlty different when not selected, by making the
   * selection only if the user performs a pointerdown and a pointerup without moving their mouse.
   * Otherwise, provided they do move, this interaction will be ignored and the annotation will be neither selected
   * nor moved. When the annotation is already selected, the behavior is the same as for other objects.
   */
  isAnnotation?: boolean;
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
  const {
    isObjectSelected,
    selectObject,
    deselectObject,
    onMoveEnd = () => Promise.resolve({ shouldMove: true }),
    isAnnotation = false,
  } = options;

  const selectionStore = useSelectionStore();
  const movingStore = useMovingStore();
  const { dragInitiatorId, hasAbortedDrag, isDragging } =
    storeToRefs(movingStore);

  const { isPointerDownDoubleClick } = usePointerDownDoubleClick();

  const { zoomFactor, pixiApplication } = storeToRefs(useWebGLCanvasStore());
  const { isWritable: isWorkflowWritable } = storeToRefs(useWorkflowStore());

  const startPos = ref<{ x: number; y: number }>({ x: 0, y: 0 });

  const registerDragAbort = () => {
    const abort = (event: KeyboardEvent) => {
      if (isDragging.value && event.key === "Escape") {
        movingStore.abortDrag();
        event.preventDefault();
      }
    };

    const teardown = () => {
      if (hasAbortedDrag.value) {
        movingStore.resetAbortDrag();
      }

      window.removeEventListener("keydown", abort);
    };

    window.addEventListener("keydown", abort);

    return teardown;
  };

  const calculateMoveDeltas = (pointerMoveEvent: PointerEvent) => {
    const deltaX =
      (pointerMoveEvent.offsetX - startPos.value.x) / zoomFactor.value;
    const deltaY =
      (pointerMoveEvent.offsetY - startPos.value.y) / zoomFactor.value;

    const isSignificantMove =
      Math.abs(deltaX) >= MIN_MOVE_THRESHOLD ||
      Math.abs(deltaY) >= MIN_MOVE_THRESHOLD;

    return { isSignificantMove, deltaX, deltaY };
  };

  const handleUnselectedAnnotation = (
    pointerDownEvent: PIXI.FederatedPointerEvent,
  ) => {
    // clicking outside an existing selection but on top of
    // an annotation should still not select it
    if (
      !selectionStore.isSelectionEmpty &&
      !isMultiselectEvent(pointerDownEvent)
    ) {
      return;
    }

    startPos.value = {
      x: pointerDownEvent.global.x,
      y: pointerDownEvent.global.y,
    };

    // check for double clicks
    if (options.onDoubleClick && isPointerDownDoubleClick(pointerDownEvent)) {
      options.onDoubleClick(pointerDownEvent);
      return;
    }

    const canvas = pixiApplication.value!.canvas;
    canvas.setPointerCapture(pointerDownEvent.pointerId);
    let didMove = false;

    const onMove = (pointerMoveEvent: PointerEvent): void => {
      const { isSignificantMove } = calculateMoveDeltas(pointerMoveEvent);

      if (!isSignificantMove) {
        return;
      }

      didMove = true;
    };

    const onUp = async () => {
      // mark interaction and do selection on pointer up instead of pointerdown
      // but only if the user didn't move the mouse between the pointerdown and the pointerup
      if (!didMove) {
        markEventAsHandled(pointerDownEvent, {
          initiator: "object-interaction",
        });
        await selectObject();
      }

      canvas.releasePointerCapture(pointerDownEvent.pointerId);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
    };

    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
  };

  const handleDefaultInteraction = async (
    pointerDownEvent: PIXI.FederatedPointerEvent,
  ) => {
    consola.trace("object interaction", { pointerDownEvent });
    markEventAsHandled(pointerDownEvent, { initiator: "object-interaction" });

    // check for double clicks
    if (options.onDoubleClick && isPointerDownDoubleClick(pointerDownEvent)) {
      options.onDoubleClick(pointerDownEvent);
      return;
    }

    startPos.value = {
      x: pointerDownEvent.global.x,
      y: pointerDownEvent.global.y,
    };

    const wasSelectedOnStart = isObjectSelected();
    const isMultiselect = isMultiselectEvent(pointerDownEvent);

    let canMove =
      (await selectionStore.canDiscardCurrentSelection()) &&
      isWorkflowWritable.value;

    if (isMultiselect) {
      const action = isObjectSelected() ? deselectObject : selectObject;
      await action();

      // forbid move on multi select
      return;
    } else if (isObjectSelected()) {
      // nothing to do, even if one cannot discard the current selection
      canMove = isWorkflowWritable.value;
    } else {
      // immediate selection feedback for non-selected objects
      await selectionStore.deselectAllObjects();
      await selectObject();
    }

    if (!canMove) {
      return;
    }

    const canvas = pixiApplication.value!.canvas;
    canvas.setPointerCapture(pointerDownEvent.pointerId);
    const removeDragAbortListener = registerDragAbort();

    // make sure to start after selection has been made, because that's async
    options.onMoveStart?.();

    let didDrag = false;

    const onMove = (pointerMoveEvent: PointerEvent): void => {
      const { isSignificantMove, deltaX, deltaY } =
        calculateMoveDeltas(pointerMoveEvent);

      if (!isSignificantMove) {
        return;
      }

      dragInitiatorId.value = options.objectId;
      didDrag = true;
      if (hasAbortedDrag.value) {
        return;
      }

      options.onMove?.(pointerMoveEvent);
      movingStore.setIsDragging(true);
      movingStore.setMovePreview({ deltaX, deltaY });
    };

    const onUp = () => {
      onMoveEnd().then(async ({ shouldMove }) => {
        if (shouldMove && didDrag) {
          await movingStore.moveObjects();
          dragInitiatorId.value = undefined;
        } else if (wasSelectedOnStart) {
          // if a drag did not occur then an interaction on a previously
          // selected object should prioritize a selection on that object alone upon
          // a pointer up
          await selectionStore.deselectAllObjects();
          await selectObject();
        }
      });
      removeDragAbortListener();
      canvas.releasePointerCapture(pointerDownEvent.pointerId);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
    };

    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
  };

  const onPointerDown = async (
    pointerDownEvent: PIXI.FederatedPointerEvent,
  ) => {
    // handle annotations differently only when they're not selected
    if (isAnnotation && !isObjectSelected()) {
      handleUnselectedAnnotation(pointerDownEvent);
      return;
    }

    await handleDefaultInteraction(pointerDownEvent);
  };

  return {
    handlePointerInteraction: onPointerDown,
    isDraggingThisObject: computed(
      () => options.objectId === dragInitiatorId.value,
    ),
  };
};
