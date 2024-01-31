import { computed, onBeforeUnmount, onMounted } from "vue";
import throttle from "raf-throttle";

import { getMetaOrCtrlKey } from "webapps-common/util/navigator";

import { useStore } from "@/composables/useStore";
import {
  workflowNavigationService,
  type Direction,
} from "@/util/workflowNavigationService";
import { isInputElement } from "@/util/isInputElement";
import type { KnimeNode } from "@/api/custom-types";
import type { WorkflowAnnotation } from "@/api/gateway-api/generated-api";

const isMovementEvent = (event: KeyboardEvent) => {
  const metaOrCtrlKey = getMetaOrCtrlKey();
  return event.shiftKey && event[metaOrCtrlKey];
};

const getPosition = (object: KnimeNode | WorkflowAnnotation) => {
  if ("position" in object) {
    return object.position;
  }

  return object.bounds;
};

export const useArrowKeyNavigation = () => {
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

    if (shouldNavigate(event) && isScrollingKey) {
      event.preventDefault();
    }
  };

  const handleMovement = (event: KeyboardEvent) => {
    if (!isWritable.value) {
      return;
    }

    const movementMinDistance = 10;

    const deltaY = {
      ArrowUp: -movementMinDistance,
      ArrowDown: movementMinDistance,
    }[event.key];

    const deltaX = {
      ArrowLeft: -movementMinDistance,
      ArrowRight: movementMinDistance,
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

    if (nearestObject?.id) {
      const kanvas = getScrollContainerElement.value();
      const halfX = kanvas.clientWidth / 2 / zoomFactor.value;
      const halfY = kanvas.clientHeight / 2 / zoomFactor.value;
      const selectionAction =
        nearestObject.type === "node" ? "selectNode" : "selectAnnotation";

      const objectScreenCoordinates =
        store.getters["canvas/screenFromCanvasCoordinates"](nearestObject);

      const DISTANCE_THRESHOLD = 25;
      const isNearLeft =
        objectScreenCoordinates.x - kanvas.offsetLeft <= DISTANCE_THRESHOLD;
      const isNearTop =
        objectScreenCoordinates.y - kanvas.offsetTop <= DISTANCE_THRESHOLD;
      const isNearRight =
        kanvas.offsetWidth - objectScreenCoordinates.x <= DISTANCE_THRESHOLD;
      const isNearBottom =
        kanvas.offsetHeight - objectScreenCoordinates.y <= DISTANCE_THRESHOLD;
      const isNearEdge = isNearLeft || isNearTop || isNearRight || isNearBottom;

      await store.dispatch("selection/deselectAllObjects");
      await store.dispatch(`selection/${selectionAction}`, nearestObject.id);

      if (isNearEdge) {
        await store.dispatch("canvas/scroll", {
          canvasX: nearestObject.x - halfX,
          canvasY: nearestObject.y - halfY,
          smooth: true,
        });
      }
    }
  };

  const keyboardNavHandler = throttle((event: KeyboardEvent) => {
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
