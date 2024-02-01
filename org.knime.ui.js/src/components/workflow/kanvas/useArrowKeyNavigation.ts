import { computed, onBeforeUnmount, onMounted, type ComputedRef } from "vue";
import throttle from "raf-throttle";

import { getMetaOrCtrlKey } from "webapps-common/util/navigator";

import type { KnimeNode } from "@/api/custom-types";
import type { WorkflowAnnotation, XY } from "@/api/gateway-api/generated-api";

import { useStore } from "@/composables/useStore";
import {
  workflowNavigationService,
  type Direction,
} from "@/util/workflowNavigationService";
import { isInputElement } from "@/util/isInputElement";
import { gridSize } from "@/style/shapes.mjs";

const isMovementEvent = (event: KeyboardEvent) => {
  const metaOrCtrlKey = getMetaOrCtrlKey();
  return event.shiftKey && event[metaOrCtrlKey];
};

const getPosition = (object: KnimeNode | WorkflowAnnotation) => {
  if ("position" in object) {
    return object.position;
  }

  return { x: object.bounds.x, y: object.bounds.y };
};

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

type UseArrowKeyNavigationOptions = {
  isHoldingDownSpace: ComputedRef<boolean>;
};

export const useArrowKeyNavigation = (
  options: UseArrowKeyNavigationOptions,
) => {
  const store = useStore();
  const activeWorkflow = computed(() => store.state.workflow.activeWorkflow);
  const isDragging = computed(() => store.state.workflow.isDragging);
  const isWritable = computed(() => store.getters["workflow/isWritable"]);
  const singleSelectedObject = computed<KnimeNode | WorkflowAnnotation>(
    () => store.getters["selection/singleSelectedObject"],
  );

  const zoomFactor = computed(() => store.state.canvas.zoomFactor);
  const getScrollContainerElement = computed(
    () => store.state.canvas.getScrollContainerElement,
  );

  const shouldNavigate = (event: KeyboardEvent) => {
    const isKanvasFocused =
      document.activeElement === getScrollContainerElement.value();
    const isBodyFocused = document.activeElement === document.body;

    return (
      (isKanvasFocused || isBodyFocused) &&
      !isInputElement(event.target as HTMLElement)
    );
  };

  // prevent native events
  const preventNativeEvents = function (event: KeyboardEvent) {
    const isScrollingKey = [
      "Space",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
    ].includes(event.key);

    if (
      shouldNavigate(event) &&
      isScrollingKey &&
      !options.isHoldingDownSpace.value
    ) {
      event.preventDefault();
    }
  };

  const handleMovement = (event: KeyboardEvent) => {
    if (!isWritable.value) {
      return;
    }

    store.commit("workflow/setTooltip", null);

    const deltaY = {
      ArrowUp: -gridSize.y,
      ArrowDown: gridSize.y,
    }[event.key];

    const deltaX = {
      ArrowLeft: -gridSize.x,
      ArrowRight: gridSize.x,
    }[event.key];

    if (!isDragging.value) {
      store.commit("workflow/setIsDragging", true);
    }

    store.commit("workflow/setMovePreview", {
      deltaX: deltaX ?? 0,
      deltaY: deltaY ?? 0,
    });
    store.dispatch("workflow/moveObjects");
  };

  const handleSelection = async (event: KeyboardEvent) => {
    if (!singleSelectedObject.value) {
      return;
    }

    const { id } = singleSelectedObject.value;
    const { x, y } = getPosition(singleSelectedObject.value);

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
      workflow: activeWorkflow.value!,
      reference: { x, y, id },
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

  const keyboardNavHandler = throttle((event: KeyboardEvent) => {
    if (options.isHoldingDownSpace.value) {
      return;
    }

    const isArrowKey = [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
    ].includes(event.key);

    if (isArrowKey && shouldNavigate(event)) {
      const handler = isMovementEvent(event) ? handleMovement : handleSelection;

      handler(event);
    }
  });

  onMounted(() => {
    window.addEventListener("keydown", preventNativeEvents);
    document.addEventListener("keydown", keyboardNavHandler);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("keydown", preventNativeEvents);
    document.removeEventListener("keydown", keyboardNavHandler);
  });
};
