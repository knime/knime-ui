import { computed, type ComputedRef, type Ref } from "vue";

import { geometry } from "@/util/geometry";
import type { XY } from "@/api/gateway-api/generated-api";
import * as $shapes from "@/style/shapes.mjs";

import { useStore } from "vuex";

interface UseMoveObjectOptions {
  id: string;
  initialPosition: Ref<XY>;
  objectElement: ComputedRef<HTMLElement | null>;
  onMoveStartCallback?: (event: PointerEvent) => any;
  onMoveCallback?: (event: PointerEvent) => any;
  onMoveEndCallback?: (event: PointerEvent) => boolean;
}

const defaultOptions: Pick<
  UseMoveObjectOptions,
  "onMoveCallback" | "onMoveEndCallback" | "onMoveStartCallback"
> = {
  onMoveStartCallback: () => {},
  onMoveCallback: () => {},
  onMoveEndCallback: () => true,
};

export const useMoveObject = (options: UseMoveObjectOptions) => {
  const store = useStore();

  const hasAbortedDrag = computed(() => store.state.workflow.hasAbortedDrag);
  const isWritable = computed(() => store.getters["workflow/isWritable"]);

  const zoomFactor = computed(() => store.state.canvas.zoomFactor);
  const isMoveLocked = computed(() => store.state.canvas.isMoveLocked);
  const screenToCanvasCoordinates = computed(
    () => store.getters["canvas/screenToCanvasCoordinates"]
  );

  const onMoveStartCallback =
    options.onMoveStartCallback || defaultOptions.onMoveStartCallback;
  const onMoveCallback =
    options.onMoveCallback || defaultOptions.onMoveCallback;
  const onMoveEndCallback =
    options.onMoveEndCallback || defaultOptions.onMoveEndCallback;

  const onPointerDown = (pointerDownEvent: PointerEvent) => {
    if (!isWritable.value || isMoveLocked.value) {
      return;
    }

    const eventTarget = pointerDownEvent.currentTarget as HTMLElement;
    onMoveStartCallback(pointerDownEvent);

    pointerDownEvent.stopPropagation();

    let hasReleased = false;
    let hasFirstOnMoveOccurred = false;

    const rect = options.objectElement.value.getBoundingClientRect();
    const isClickInsideReference =
      pointerDownEvent.clientX > rect.left &&
      pointerDownEvent.clientX < rect.right &&
      pointerDownEvent.clientY > rect.top &&
      pointerDownEvent.clientY < rect.bottom;

    if (!isClickInsideReference) {
      return;
    }

    const clickPosition = {
      x: Math.floor(pointerDownEvent.clientX - rect.left) / zoomFactor.value,
      y: Math.floor(pointerDownEvent.clientY - rect.top) / zoomFactor.value,
    };

    const gridAdjustedPosition = {
      x: geometry.utils.snapToGrid(options.initialPosition.value.x),
      y: geometry.utils.snapToGrid(options.initialPosition.value.y),
    };

    const startPosition = {
      ...gridAdjustedPosition,

      // account for any delta between the current position and its grid-adjusted equivalent.
      // this is useful for nodes that might be not aligned to the grid, so that they can be brought back in
      // during the drag operation
      positionDelta: {
        x: gridAdjustedPosition.x - options.initialPosition.value.x,
        y: gridAdjustedPosition.y - options.initialPosition.value.y,
      },
    };

    const onMove = (ptrMoveEvent: PointerEvent) => {
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

      const deltaX = geometry.utils.snapToGrid(
        moveX - startPosition.x - clickPosition.x,
        snapSize
      );
      const deltaY = geometry.utils.snapToGrid(
        moveY - startPosition.y - clickPosition.y,
        snapSize
      );

      store.commit("workflow/setIsDragging", true);
      store.commit("workflow/setMovePreview", {
        deltaX: deltaX + startPosition.positionDelta.x,
        deltaY: deltaY + startPosition.positionDelta.y,
      });
    };

    // eslint-disable-next-line func-style
    function onUp(ptrUpEvent: PointerEvent) {
      hasReleased = true;

      const shouldMove = onMoveEndCallback(ptrUpEvent);

      if (shouldMove && !hasAbortedDrag.value) {
        store.dispatch("workflow/moveObjects");
      }

      if (hasAbortedDrag.value) {
        store.dispatch("workflow/resetAbortDrag");
      }

      eventTarget.releasePointerCapture(pointerDownEvent.pointerId);
      document.removeEventListener("pointermove", onMove);
      eventTarget.removeEventListener("pointerup", onUp);
      eventTarget.removeEventListener(
        "lostpointercapture",
        // eslint-disable-next-line no-use-before-define
        onLostPointerCapture
      );
    }

    // eslint-disable-next-line func-style
    function onLostPointerCapture(event: PointerEvent) {
      if (!hasReleased) {
        onUp(event);
      }
    }

    document.addEventListener("pointermove", onMove);
    eventTarget.addEventListener("pointerup", onUp);
    eventTarget.addEventListener("lostpointercapture", onLostPointerCapture);
  };

  return { onPointerDown };
};
