import { computed, type ComputedRef, type Ref } from "vue";
import throttle from "raf-throttle";

import { geometry } from "@/util/geometry";
import type { XY } from "@/api/gateway-api/generated-api";
import * as $shapes from "@/style/shapes.mjs";

import { useStore } from "./useStore";

interface UseMoveObjectOptions {
  objectElement?: ComputedRef<HTMLElement | null>;
  useGridSnapping?: boolean;
  onMoveStartCallback?: (event: PointerEvent) => any;
  onMoveCallback?: (event: PointerEvent) => any;
  onMoveEndCallback?: (event: PointerEvent) => Promise<boolean>;
}

const defaultOptions: Omit<UseMoveObjectOptions, "objectElement"> = {
  useGridSnapping: true,
  onMoveStartCallback: () => {},
  onMoveCallback: () => {},
  onMoveEndCallback: () => Promise.resolve(true),
};

export const useMoveObject = (options: UseMoveObjectOptions) => {
  const store = useStore();

  const hasAbortedDrag = computed(() => store.state.workflow.hasAbortedDrag);
  const isWritable = computed(() => store.getters["workflow/isWritable"]);

  const zoomFactor = computed(() => store.state.canvas.zoomFactor);
  const isMoveLocked = computed(() => store.state.canvas.isMoveLocked);
  const screenToCanvasCoordinates = computed(
    () => store.getters["canvas/screenToCanvasCoordinates"],
  );

  const onMoveStartCallback =
    options.onMoveStartCallback || defaultOptions.onMoveStartCallback;
  const onMoveCallback =
    options.onMoveCallback || defaultOptions.onMoveCallback;
  const onMoveEndCallback =
    options.onMoveEndCallback || defaultOptions.onMoveEndCallback;
  const useGridSnapping =
    options.useGridSnapping ?? defaultOptions.useGridSnapping;

  const isClickInsideReference = (pointerDownEvent: PointerEvent) => {
    const rect = options.objectElement.value.getBoundingClientRect();
    return (
      pointerDownEvent.clientX > rect.left &&
      pointerDownEvent.clientX < rect.right &&
      pointerDownEvent.clientY > rect.top &&
      pointerDownEvent.clientY < rect.bottom
    );
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

      const rect = options.objectElement
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

      const onMove = throttle((ptrMoveEvent: PointerEvent) => {
        // skip first onMove event
        // on windows touchpads a single onMove is triggered when the user meant a double tap
        if (!hasFirstOnMoveOccurred) {
          hasFirstOnMoveOccurred = true;
          return;
        }

        eventTarget.setPointerCapture(pointerDownEvent.pointerId);
        if (hasAbortedDrag.value || hasReleased) {
          return;
        }

        onMoveCallback(ptrMoveEvent);

        const snapSize = ptrMoveEvent.altKey ? 1 : $shapes.gridSize.x;

        const [moveX, moveY] = screenToCanvasCoordinates.value([
          ptrMoveEvent.clientX,
          ptrMoveEvent.clientY,
        ]);

        const snapFn = useGridSnapping
          ? geometry.utils.snapToGrid
          : (val) => val;

        const deltaX = snapFn(
          moveX - startPosition.x - clickPosition.x,
          snapSize,
        );
        const deltaY = snapFn(
          moveY - startPosition.y - clickPosition.y,
          snapSize,
        );

        store.commit("workflow/setIsDragging", true);
        store.commit("workflow/setMovePreview", {
          deltaX: deltaX + startPosition.positionDelta.x,
          deltaY: deltaY + startPosition.positionDelta.y,
        });
      });

      const onUp = (ptrUpEvent: PointerEvent) => {
        // use separate function to avoid returning promise
        // from callback which should return void
        const handler = async () => {
          hasReleased = true;

          const shouldMove = await onMoveEndCallback(ptrUpEvent);
          try {
            if (shouldMove && !hasAbortedDrag.value) {
              await store.dispatch("workflow/moveObjects");
            }
          } catch (error) {
            consola.error("Error moving objects", error);
            await store.dispatch("workflow/resetDragState");
          }

          if (hasAbortedDrag.value) {
            await store.dispatch("workflow/resetAbortDrag");
          }

          eventTarget.releasePointerCapture(pointerDownEvent.pointerId);
          document.removeEventListener("pointermove", onMove);
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
