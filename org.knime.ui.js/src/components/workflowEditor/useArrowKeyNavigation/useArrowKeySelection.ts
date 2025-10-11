import { type Ref, onMounted } from "vue";
import { useEventListener, useTimeoutFn } from "@vueuse/core";
import { storeToRefs } from "pinia";

import type { WorkflowObject } from "@/api/custom-types";
import { isUIExtensionFocused } from "@/components/uiExtensions";
import { useSVGCanvasStore } from "@/store/canvas/canvas-svg";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useSelectionStore } from "@/store/selection";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { isInputElement } from "@/util/isInputElement";
import {
  type Direction,
  workflowNavigationService,
} from "@/util/workflowNavigationService";
import { canvasRendererUtils } from "../util/canvasRenderer";

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

type UseArrowKeySelectionOptions = {
  rootEl: Ref<HTMLElement>;
};

export const useArrowKeySelection = (options: UseArrowKeySelectionOptions) => {
  const { workflowObjects } = storeToRefs(useWorkflowStore());

  const { getFocusedObject: focusedObject } = storeToRefs(useSelectionStore());

  const {
    focusObject,
    deselectAllObjects,
    isNodeSelected,
    isAnnotationSelected,
    selectNodes,
    deselectNodes,
    selectAnnotations,
    deselectAnnotations,
    selectComponentPlaceholder,
    querySelection,
    commitSelectionPreview,
  } = useSelectionStore();

  const SELECTION_MODE = "preview" as const;
  const { singleSelectedObject, selectedObjects, isSelectionEmpty } =
    querySelection(SELECTION_MODE);

  const canvasStore = canvasRendererUtils.isSVGRenderer()
    ? useSVGCanvasStore()
    : useWebGLCanvasStore();

  // eslint-disable-next-line complexity
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

      focusObject(nearestObject);
      canvasStore.moveObjectIntoView(nearestObject);

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

      focusObject(objectToFocus);
      canvasStore.moveObjectIntoView(objectToFocus);

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

      deselectAllObjects([], SELECTION_MODE);

      if (nearestObject.type === "componentPlaceholder") {
        selectComponentPlaceholder(nearestObject.id);
      }

      if (nearestObject.type === "annotation") {
        selectAnnotations([nearestObject.id], SELECTION_MODE);
      }

      if (nearestObject.type === "node") {
        selectNodes([nearestObject.id], SELECTION_MODE);
      }

      canvasStore.moveObjectIntoView(nearestObject);

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

      // deselect everything and select object that's furthest away in the same direction
      deselectAllObjects([], SELECTION_MODE);
      const select =
        furthestObject.type === "node" ? selectNodes : selectAnnotations;
      select([furthestObject.id], SELECTION_MODE);
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
      if (focusedObject.value.type === "node") {
        const action = isNodeSelected(focusedObject.value.id)
          ? deselectNodes
          : selectNodes;
        action([focusedObject.value.id]);
      } else {
        const action = isAnnotationSelected(focusedObject.value.id)
          ? deselectAnnotations
          : selectAnnotations;
        action([focusedObject.value.id]);
      }
    }
  };

  onMounted(() => {
    useEventListener(options.rootEl, "keydown", selectOnEnter);
  });

  const TIMEOUT_DELAY_MS = 300;
  const {
    isPending,
    start: startTimer,
    stop: stopTimer,
  } = useTimeoutFn(commitSelectionPreview, TIMEOUT_DELAY_MS, {
    immediate: false,
  });

  return {
    handleSelection: (event: KeyboardEvent) => {
      const isJustChangingFocus = event.shiftKey;
      if (isJustChangingFocus) {
        handleSelection(event);
        return;
      }

      // commit selection only after timer has run, but cancel
      // any pending timer if another selection comes in quick enough
      if (isPending.value) {
        stopTimer();
      }

      handleSelection(event).then(startTimer);
    },
  };
};
