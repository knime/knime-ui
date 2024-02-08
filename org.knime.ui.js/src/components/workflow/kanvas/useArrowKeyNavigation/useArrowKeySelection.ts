import { computed, onBeforeUnmount, onMounted } from "vue";

import { capitalize } from "webapps-common/util/capitalize";
import type { WorkflowObject } from "@/api/custom-types";
import type { XY } from "@/api/gateway-api/generated-api";

import { useStore } from "@/composables/useStore";
import {
  workflowNavigationService,
  type Direction,
} from "@/util/workflowNavigationService";
import { isInputElement } from "@/util/isInputElement";
import { isUIExtensionFocused } from "@/components/uiExtensions";

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

const getDirection = (event: KeyboardEvent): Direction => {
  return (
    {
      ArrowUp: "top",
      ArrowDown: "bottom",
      ArrowLeft: "left",
      ArrowRight: "right",
    } as const
  )[event.key]!;
};

export const useArrowKeySelection = () => {
  const store = useStore();
  const workflowObjects = computed<WorkflowObject[]>(
    () => store.getters["workflow/workflowObjects"],
  );
  const singleSelectedObject = computed<WorkflowObject | null>(
    () => store.getters["selection/singleSelectedObject"],
  );
  const isNodeSelected = computed<(id: string) => boolean>(
    () => store.getters["selection/isNodeSelected"],
  );
  const isAnnotationSelected = computed<(id: string) => boolean>(
    () => store.getters["selection/isAnnotationSelected"],
  );
  const focusedObject = computed<WorkflowObject | null>(
    () => store.getters["selection/focusedObject"],
  );
  const isSelectionEmpty = computed<boolean>(
    () => store.getters["selection/isSelectionEmpty"],
  );

  const selectedObjects = computed<Array<WorkflowObject>>(
    () => store.getters["selection/selectedObjects"],
  );

  const zoomFactor = computed(() => store.state.canvas.zoomFactor);
  const getScrollContainerElement = computed(
    () => store.state.canvas.getScrollContainerElement,
  );

  const moveObjectIntoView = async (workflowObject: WorkflowObject) => {
    const kanvas = getScrollContainerElement.value();
    const objectScreenCoordinates =
      store.getters["canvas/screenFromCanvasCoordinates"](workflowObject);

    if (isOutsideKanvasView(kanvas, objectScreenCoordinates)) {
      const halfX = kanvas.clientWidth / 2 / zoomFactor.value;
      const halfY = kanvas.clientHeight / 2 / zoomFactor.value;

      // scroll object into canvas center
      await store.dispatch("canvas/scroll", {
        canvasX: workflowObject.x - halfX,
        canvasY: workflowObject.y - halfY,
        smooth: true,
      });
    }
  };

  const handleSelection = async (event: KeyboardEvent) => {
    const isMultiselect = event.shiftKey;

    /**
     * case 1: has focused obj         -> arrow WITH shift  >=>> move focus to nearest object
     *
     * case 2: no focused obj          -> arrow WITH shift  >=>> focus outermost object in the selection (based on direction)
     *
     * case 3: single selected obj,    -> arrow W/O shift   >=>> select next nearest object
     *         (has focused obj &&
     *         empty selection)
     *
     * case 4: multiple obj selected   -> arrow W/O shift   >=>> escape multiselection & select outermost object (based on direction)
     *
     * All cases should be treated as mutually exclusive
     */

    if (focusedObject.value && isMultiselect) {
      consola.log("Case 1: has focused obj -> arrow key WITH shift pressed");

      const nearestObject = await workflowNavigationService.nearestObject({
        objects: workflowObjects.value,
        reference: focusedObject.value,
        direction: getDirection(event),
      });

      if (!nearestObject?.id) {
        return;
      }

      store.commit("selection/focusObject", nearestObject);
      await moveObjectIntoView(nearestObject);

      return;
    }

    if (!focusedObject.value && isMultiselect) {
      consola.log("Case 2: no focused obj -> arrow key WITH shift pressed");

      if (isSelectionEmpty.value) {
        // in this case we cannot do anything, since there's no focus and no selection
        return;
      }

      const objectToFocus =
        selectedObjects.value.length > 1
          ? // since the selection contains multiple items AND there's no focus
            // we need to guess the reference object. For this, we simply find the "outermost"
            // object inside the selection that is in the same direction of the used arrow key
            getFurthestObjectByDirection(selectedObjects.value, event)
          : singleSelectedObject.value!;

      store.commit("selection/focusObject", objectToFocus);

      await moveObjectIntoView(objectToFocus);

      return;
    }

    const hasFocusWithEmptySelection =
      focusedObject.value && isSelectionEmpty.value;
    if (
      (singleSelectedObject.value || hasFocusWithEmptySelection) &&
      !isMultiselect
    ) {
      consola.log(
        "Case 3: single obj selected or selection empty with focused object -> arrow key W/O shift pressed",
      );

      const reference = singleSelectedObject.value ?? focusedObject.value!;

      const nearestObject = await workflowNavigationService.nearestObject({
        objects: workflowObjects.value,
        reference,
        direction: getDirection(event),
      });

      if (!nearestObject?.id) {
        return;
      }

      const selectionAction =
        nearestObject.type === "node" ? "selectNode" : "selectAnnotation";

      store.commit("selection/unfocusObject");
      await store.dispatch("selection/deselectAllObjects");
      await store.dispatch(`selection/${selectionAction}`, nearestObject.id);

      await moveObjectIntoView(nearestObject);

      return;
    }

    if (selectedObjects.value.length > 1 && !isMultiselect) {
      consola.log(
        "Case 4: multiple obj selected -> arrow key W/O shift pressed",
      );

      // since the selection contains multiple items and we don't want to multiselect
      // we need to guess the reference object. For this, we simply find the "outermost"
      // object in the selection that is in the same direction of the used arrow key
      // and use that as the item that will be selected
      const furthestObject = getFurthestObjectByDirection(
        selectedObjects.value,
        event,
      );

      const selectionAction =
        furthestObject.type === "node" ? "selectNode" : "selectAnnotation";

      // deselect everything and select object that's furthest away in the same direction
      await store.dispatch("selection/deselectAllObjects");
      await store.dispatch(`selection/${selectionAction}`, furthestObject.id);
    }
  };

  const selectOnEnter = (event: KeyboardEvent) => {
    if (
      event.key !== "Enter" ||
      isInputElement(event.target as HTMLElement) ||
      isUIExtensionFocused()
    ) {
      return;
    }

    if (focusedObject.value !== null) {
      const isObjectSelected = {
        node: isNodeSelected,
        annotation: isAnnotationSelected,
      }[focusedObject.value.type];

      const action = isObjectSelected.value(focusedObject.value.id)
        ? `deselect${capitalize(focusedObject.value.type)}`
        : `select${capitalize(focusedObject.value.type)}`;

      store.dispatch(`selection/${action}`, focusedObject.value.id);
    }
  };

  onMounted(() => {
    window.addEventListener("keydown", selectOnEnter);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("keydown", selectOnEnter);
  });

  return { handleSelection };
};
