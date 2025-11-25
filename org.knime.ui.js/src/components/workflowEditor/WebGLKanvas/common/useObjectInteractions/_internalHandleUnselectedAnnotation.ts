import type { FederatedPointerEvent } from "pixi.js";

import { isMultiselectEvent } from "@/components/workflowEditor/util/isMultiselectEvent";
import { useSelectionStore } from "@/store/selection";
import { markPointerEventAsHandled } from "../../util/interaction";
import { pixiGlobals } from "../pixiGlobals";

import { useObjectHandler } from "./_internalUseObjectSelectionHandler";
import { usePositionUtils } from "./_internalUsePositionUtils";
import type { ObjectMetadata } from "./types";

type Options = {
  objectMetadata: ObjectMetadata;
  isDoubleClick: (event: PointerEvent) => boolean;

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
 * Annotations are handled differently when not selected: by making the
 * selection only if the user performs a pointerdown and a pointerup without
 * moving their mouse.
 * Otherwise, provided they do move, this interaction will be ignored and
 * the annotation will be neither selected nor moved.
 * When the annotation **is already selected**, the behavior is the same as
 * for other objects.
 *
 * **ONLY FOR INTERNAL USAGE**
 */
export const useHandleUnselectedAnnotation = (options: Options) => {
  const { objectMetadata } = options;

  const selectionStore = useSelectionStore();

  const objectHandler = useObjectHandler(objectMetadata);
  const { setStartPosition, calculateMoveDeltas } = usePositionUtils({
    objectMetadata,
  });

  const handleUnselectedAnnotation = (
    pointerDownEvent: FederatedPointerEvent,
  ) => {
    // clicking outside an existing selection but on top of
    // an annotation should still not select it
    if (
      !selectionStore.isSelectionEmpty &&
      !isMultiselectEvent(pointerDownEvent)
    ) {
      return;
    }

    setStartPosition(pointerDownEvent);
    // check for double clicks
    if (options.onDoubleClick && options.isDoubleClick(pointerDownEvent)) {
      options.onDoubleClick(pointerDownEvent);
      return;
    }

    const canvas = pixiGlobals.getCanvas();
    canvas.setPointerCapture(pointerDownEvent.pointerId);
    let didMove = false;

    const onMove = (pointerMoveEvent: PointerEvent): void => {
      const { isSignificantMove } = calculateMoveDeltas(pointerMoveEvent);

      if (!isSignificantMove) {
        return;
      }

      didMove = true;
    };

    const onUp = () => {
      // mark interaction and do selection on pointer up instead of pointerdown
      // but only if the user didn't move the mouse between the pointerdown and the pointerup
      if (!didMove) {
        markPointerEventAsHandled(pointerDownEvent, {
          initiator: "object-interaction",
        });

        objectHandler.selectObject();
        options.onSelect?.();
      }

      canvas.releasePointerCapture(pointerDownEvent.pointerId);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
    };

    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
  };

  return { handleUnselectedAnnotation };
};
