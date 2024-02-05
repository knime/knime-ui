import { computed } from "vue";

import type { WorkflowObject } from "@/api/custom-types";
import type { XY } from "@/api/gateway-api/generated-api";

import { useStore } from "@/composables/useStore";
import {
  workflowNavigationService,
  type Direction,
} from "@/util/workflowNavigationService";

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

const getFurthestObjectByDirection = (
  selectedObjects: Array<WorkflowObject>,
  event: KeyboardEvent,
): WorkflowObject => {
  const initialCompareValue = (
    {
      ArrowUp: Infinity,
      ArrowDown: -Infinity,
      ArrowLeft: Infinity,
      ArrowRight: -Infinity,
    } as const
  )[event.key]!;

  let result: WorkflowObject = selectedObjects.at(0)!;
  let compareValue = initialCompareValue;

  selectedObjects.forEach((object) => {
    if (event.key === "ArrowUp" && compareValue > object.y) {
      result = object;
      compareValue = object.y;
    }

    if (event.key === "ArrowDown" && compareValue < object.y) {
      result = object;
      compareValue = object.y;
    }

    if (event.key === "ArrowLeft" && compareValue > object.x) {
      result = object;
      compareValue = object.x;
    }

    if (event.key === "ArrowRight" && compareValue < object.x) {
      result = object;
      compareValue = object.x;
    }
  });

  return result;
};

export const useArrowKeySelection = () => {
  const store = useStore();
  const workflowObjects = computed<WorkflowObject[]>(
    () => store.getters["workflow/workflowObjects"],
  );
  const singleSelectedObject = computed<WorkflowObject>(
    () => store.getters["selection/singleSelectedObject"],
  );

  const selectedObjects = computed<
    Array<{
      x: number;
      y: number;
      id: string;
      type: "node" | "annotation";
    }>
  >(() => store.getters["selection/selectedObjects"]);

  const zoomFactor = computed(() => store.state.canvas.zoomFactor);
  const getScrollContainerElement = computed(
    () => store.state.canvas.getScrollContainerElement,
  );

  const handleSelection = async (event: KeyboardEvent) => {
    if (selectedObjects.value.length === 0) {
      return;
    }

    // arrow key was pressed but multiple objects are selected
    if (!singleSelectedObject.value) {
      const furthestObject = getFurthestObjectByDirection(
        selectedObjects.value,
        event,
      );

      const selectionAction =
        furthestObject.type === "node" ? "selectNode" : "selectAnnotation";

      // deselect everything and select object that's furthest away in the same direction
      await store.dispatch("selection/deselectAllObjects");
      await store.dispatch(`selection/${selectionAction}`, furthestObject.id);

      return;
    }

    const getDirection = (): Direction => {
      return (
        {
          ArrowUp: "top",
          ArrowDown: "bottom",
          ArrowLeft: "left",
          ArrowRight: "right",
        } as const
      )[event.key]!;
    };

    const nearestObject = await workflowNavigationService.nearestObject({
      objects: workflowObjects.value,
      reference: singleSelectedObject.value,
      direction: getDirection(),
    });

    if (!nearestObject?.id) {
      return;
    }

    const kanvas = getScrollContainerElement.value();
    const selectionAction =
      nearestObject.type === "node" ? "selectNode" : "selectAnnotation";

    const objectScreenCoordinates =
      store.getters["canvas/screenFromCanvasCoordinates"](nearestObject);

    await store.dispatch("selection/deselectAllObjects");
    await store.dispatch(`selection/${selectionAction}`, nearestObject.id);

    if (isOutsideKanvasView(kanvas, objectScreenCoordinates)) {
      const halfX = kanvas.clientWidth / 2 / zoomFactor.value;
      const halfY = kanvas.clientHeight / 2 / zoomFactor.value;

      // scroll object into canvas center
      await store.dispatch("canvas/scroll", {
        canvasX: nearestObject.x - halfX,
        canvasY: nearestObject.y - halfY,
        smooth: true,
      });
    }
  };

  return { handleSelection };
};
