import { type ComputedRef, type Ref } from "vue";
import { storeToRefs } from "pinia";
import throttle from "raf-throttle";

import type { XY } from "@/api/gateway-api/generated-api";
import { useSVGCanvasStore } from "@/store/canvas/canvas-svg";
import { useSelectionStore } from "@/store/selection";
import { useMovingStore } from "@/store/workflow/moving";
import { useWorkflowStore } from "@/store/workflow/workflow";
import * as $shapes from "@/style/shapes";
import { geometry } from "@/util/geometry";

interface UseMoveObjectOptions {
  objectElement?: ComputedRef<HTMLElement | null>;
  useGridSnapping?: boolean;
  onMoveStartCallback?: (event: PointerEvent) => any;
  onMoveCallback?: (event: PointerEvent) => any;
  onMoveEndCallback?: (event: PointerEvent) => Promise<boolean>;
}

const defaultOptions: Required<Omit<UseMoveObjectOptions, "objectElement">> = {
  useGridSnapping: true,
  onMoveStartCallback: () => {},
  onMoveCallback: () => {},
  onMoveEndCallback: () => Promise.resolve(true),
};

export const useMoveObject = (options: UseMoveObjectOptions) => {
  const movingStore = useMovingStore();
  const { hasAbortedDrag, isDragging } = storeToRefs(movingStore);
  const { isMoveLocked, screenToCanvasCoordinates, zoomFactor } = storeToRefs(
    useSVGCanvasStore(),
  );
  const { isWritable } = storeToRefs(useWorkflowStore());
  const selectionStore = useSelectionStore();
  const { shouldHideSelection } = storeToRefs(selectionStore);

  const onMoveStartCallback =
    options.onMoveStartCallback || defaultOptions.onMoveStartCallback;
  const onMoveCallback =
    options.onMoveCallback || defaultOptions.onMoveCallback;
  const onMoveEndCallback =
    options.onMoveEndCallback || defaultOptions.onMoveEndCallback;
  const useGridSnapping =
    options.useGridSnapping ?? defaultOptions.useGridSnapping;

  const isClickInsideReference = (pointerDownEvent: PointerEvent) => {
    const rect = options.objectElement!.value!.getBoundingClientRect();
    return (
      pointerDownEvent.clientX > rect.left &&
      pointerDownEvent.clientX < rect.right &&
      pointerDownEvent.clientY > rect.top &&
      pointerDownEvent.clientY < rect.bottom
    );
  };

  const isSignificantMove = (startPosition: XY, newPosition: XY) => {
    const MOVE_THRESHOLD = 5;
    const deltaX = Math.abs(newPosition.x - startPosition.x);
    const deltaY = Math.abs(newPosition.y - startPosition.y);

    return deltaX >= MOVE_THRESHOLD || deltaY >= MOVE_THRESHOLD;
  };

  const createPointerDownHandler =
    (initialPosition: Ref<XY>) => (pointerDownEvent: PointerEvent) => {
      pointerDownEvent.stopPropagation();

      if (!isWritable.value || isMoveLocked.value) {
        return;
      }

      const eventTarget = pointerDownEvent.currentTarget as HTMLElement;
      onMoveStartCallback(pointerDownEvent);

      let hasReleased = false;
      let hasFirstOnMoveOccurred = false;

      if (options.objectElement && !isClickInsideReference(pointerDownEvent)) {
        return;
      }

      const rect = options.objectElement?.value
        ? options.objectElement.value.getBoundingClientRect()
        : { left: pointerDownEvent.clientX, top: pointerDownEvent.clientY };

      const clickPosition = {
        x: Math.floor(pointerDownEvent.clientX - rect.left) / zoomFactor.value,
        y: Math.floor(pointerDownEvent.clientY - rect.top) / zoomFactor.value,
      };

      const gridAdjustedPosition = useGridSnapping
        ? {
            x: geometry.utils.snapToGrid(initialPosition.value.x),
            y: geometry.utils.snapToGrid(initialPosition.value.y),
          }
        : initialPosition.value;

      const startPosition = {
        ...gridAdjustedPosition,

        // account for any delta between the current position and its grid-adjusted equivalent.
        // this is useful for nodes that might be not aligned to the grid, so that they can be brought back in
        // during the drag operation
        positionDelta: {
          x: gridAdjustedPosition.x - initialPosition.value.x,
          y: gridAdjustedPosition.y - initialPosition.value.y,
        },
      };

      const onMove = throttle((pointerMoveEvent: PointerEvent) => {
        // skip first onMove event
        // on windows touchpads a single onMove is triggered when the user meant a double tap
        if (!hasFirstOnMoveOccurred) {
          hasFirstOnMoveOccurred = true;
          return;
        }

        // only allow left-clicks
        if (pointerMoveEvent.buttons !== 1) {
          return;
        }

        eventTarget.setPointerCapture(pointerDownEvent.pointerId);
        if (hasAbortedDrag.value || hasReleased) {
          return;
        }

        const snapSize = pointerMoveEvent.altKey ? 1 : $shapes.gridSize.x;

        const [moveX, moveY] = screenToCanvasCoordinates.value([
          pointerMoveEvent.clientX,
          pointerMoveEvent.clientY,
        ]);

        if (
          !isSignificantMove(
            { x: pointerDownEvent.clientX, y: pointerDownEvent.clientY },
            { x: pointerMoveEvent.clientX, y: pointerMoveEvent.clientY },
          )
        ) {
          return;
        }

        onMoveCallback(pointerMoveEvent);

        if (!shouldHideSelection.value) {
          selectionStore.setShouldHideSelection(true);
        }

        const snapFn = useGridSnapping
          ? geometry.utils.snapToGrid
          : (val: number) => val;

        const deltaX = snapFn(
          moveX - startPosition.x - clickPosition.x,
          snapSize,
        );
        const deltaY = snapFn(
          moveY - startPosition.y - clickPosition.y,
          snapSize,
        );

        if (!isDragging.value) {
          movingStore.setIsDragging(true);
        }
        movingStore.setMovePreview({
          deltaX: deltaX + startPosition.positionDelta.x,
          deltaY: deltaY + startPosition.positionDelta.y,
        });
      });

      const onUp = (pointerUpEvent: PointerEvent) => {
        // use separate function to avoid returning promise
        // from callback which should return void
        const handler = async () => {
          hasReleased = true;

          const shouldMove = await onMoveEndCallback(pointerUpEvent);
          try {
            if (shouldMove && !hasAbortedDrag.value) {
              await movingStore.moveObjects();
            }
          } catch (error) {
            consola.error("Error moving objects", error);
            movingStore.resetDragState();
          } finally {
            selectionStore.setShouldHideSelection(false);
          }

          if (hasAbortedDrag.value) {
            movingStore.resetAbortDrag();
          }

          eventTarget.releasePointerCapture(pointerDownEvent.pointerId);
          document.removeEventListener("pointermove", onMove);
          document.removeEventListener("pointerup", onUp);
          eventTarget.removeEventListener("pointerup", onUp);
          eventTarget.removeEventListener(
            "lostpointercapture",
            // eslint-disable-next-line no-use-before-define
            onLostPointerCapture,
          );
        };

        handler();
      };

      // eslint-disable-next-line func-style
      function onLostPointerCapture(event: PointerEvent) {
        if (!hasReleased) {
          onUp(event);
        }
      }

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      eventTarget.addEventListener("pointerup", onUp);
      eventTarget.addEventListener("lostpointercapture", onLostPointerCapture);
    };

  return { createPointerDownHandler };
};
