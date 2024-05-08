import { computed } from "vue";

import { capitalize } from "webapps-common/util/capitalize";

import { useStore } from "@/composables/useStore";
import {
  workflowNavigationService,
  type Direction,
} from "@/util/workflowNavigationService";

export const useInitialSelection = () => {
  const store = useStore();

  const selectedObjects = computed(
    () => store.getters["selection/selectedObjects"],
  );

  const hasSelectedObjects = () => {
    return selectedObjects.value.length > 0;
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
    const objects = store.getters["workflow/workflowObjects"];
    if (objects.length === 0) {
      return;
    }

    const isKeyboardEvent = event instanceof KeyboardEvent;

    const referencePoint = store.getters["canvas/getCenterOfScrollContainer"](
      isKeyboardEvent ? "center" : "left",
    );

    // look for the "first" object, just use one if we can't find a near one at the center
    const mostCenterObject = await workflowNavigationService.nearestObject({
      objects,
      reference: {
        ...referencePoint,
        id: "",
      },
      direction: isKeyboardEvent ? directionMap[event.key] : "right",
    });

    // the nearestObject uses some max distances so it can happen that there is nothing "found", just use any object
    const objectToSelect = mostCenterObject ?? objects.at(0);

    await store.dispatch(
      `selection/select${capitalize(objectToSelect.type)}`,
      objectToSelect.id,
    );

    await store.dispatch("canvas/moveObjectIntoView", objectToSelect);
  };

  return {
    handleInitialSelection,
  };
};
