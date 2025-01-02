import { storeToRefs } from "pinia";

import { capitalize } from "@knime/utils";

import { useCanvasStore } from "@/store/canvas";
import { useSelectionStore } from "@/store/selection";
import { useWorkflowStore } from "@/store/workflow/workflow";
import {
  type Direction,
  workflowNavigationService,
} from "@/util/workflowNavigationService";

export const useInitialSelection = () => {
  const selectionStore = useSelectionStore();
  const { workflowObjects } = storeToRefs(useWorkflowStore());
  const { getCenterOfScrollContainer, moveObjectIntoView } = useCanvasStore();

  const hasSelectedObjects = () => {
    return selectionStore.selectedObjects.length > 0;
  };

  const handleInitialSelection = async (event?: KeyboardEvent) => {
    // we only select something if we don't have a selection yet
    if (hasSelectedObjects()) {
      return;
    }

    const directionMap: Record<string, Direction> = {
      ArrowLeft: "left",
      ArrowRight: "right",
      ArrowUp: "top",
      ArrowDown: "bottom",
    } as const;

    // do we have some objects?
    if (workflowObjects.value.length === 0) {
      return;
    }

    const isKeyboardEvent = event instanceof KeyboardEvent;

    const referencePoint = getCenterOfScrollContainer(
      isKeyboardEvent ? "center" : "left",
    );

    // look for the "first" object, just use one if we can't find a near one at the center
    const mostCenterObject = await workflowNavigationService.nearestObject({
      objects: workflowObjects.value,
      reference: {
        ...referencePoint,
        id: "",
      },
      direction: isKeyboardEvent ? directionMap[event.key] : "right",
    });

    // the nearestObject uses some max distances so it can happen that there is nothing "found", just use any object
    const objectToSelect = mostCenterObject ?? workflowObjects.value.at(0)!;

    selectionStore[`select${capitalize(objectToSelect.type)}`](
      objectToSelect.id,
    );

    moveObjectIntoView(objectToSelect);
  };

  return {
    handleInitialSelection,
  };
};
