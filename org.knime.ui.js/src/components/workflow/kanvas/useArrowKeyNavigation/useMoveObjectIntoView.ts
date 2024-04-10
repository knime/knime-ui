import type { WorkflowObject } from "@/api/custom-types";
import type { XY } from "@/api/gateway-api/generated-api";
import { useStore } from "@/composables/useStore";

const isOutsideKanvasView = (
  kanvas: HTMLElement,
  referenceObjectCoords: XY,
) => {
  const DISTANCE_THRESHOLD = 25;

  const isNearLeft =
    referenceObjectCoords.x - kanvas.offsetLeft <= DISTANCE_THRESHOLD;

  const isNearTop =
    referenceObjectCoords.y - kanvas.offsetTop <= DISTANCE_THRESHOLD;

  const isNearRight =
    kanvas.offsetWidth - (referenceObjectCoords.x - kanvas.offsetLeft) <=
    DISTANCE_THRESHOLD;

  const isNearBottom =
    kanvas.offsetHeight - (referenceObjectCoords.y - kanvas.offsetTop) <=
    DISTANCE_THRESHOLD;

  return isNearLeft || isNearTop || isNearRight || isNearBottom;
};

const useMoveObjectIntoView = () => {
  const store = useStore();

  const moveObjectIntoView = async (workflowObject: WorkflowObject) => {
    const kanvas = store.state.canvas.getScrollContainerElement();
    const { zoomFactor } = store.state.canvas;
    const objectScreenCoordinates =
      store.getters["canvas/screenFromCanvasCoordinates"](workflowObject);

    if (isOutsideKanvasView(kanvas, objectScreenCoordinates)) {
      const halfX = kanvas.clientWidth / 2 / zoomFactor;
      const halfY = kanvas.clientHeight / 2 / zoomFactor;

      // scroll object into canvas center
      await store.dispatch("canvas/scroll", {
        canvasX: workflowObject.x - halfX,
        canvasY: workflowObject.y - halfY,
        smooth: true,
      });
    }
  };
  return moveObjectIntoView;
};

export { useMoveObjectIntoView, isOutsideKanvasView };
