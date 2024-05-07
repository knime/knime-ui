import { onBeforeUnmount, onMounted, type ComputedRef, type Ref } from "vue";
import throttle from "raf-throttle";

import { getMetaOrCtrlKey } from "webapps-common/util/navigator";

import { isInputElement } from "@/util/isInputElement";

import { useArrowKeySelection } from "./useArrowKeySelection";
import { useArrowKeyMoving } from "./useArrowKeyMoving";
import { useInitialSelection } from "../useInitialSelection";
import { useStore } from "@/composables/useStore";

const isMovementEvent = (event: KeyboardEvent) => {
  const metaOrCtrlKey = getMetaOrCtrlKey();
  return event.shiftKey && event[metaOrCtrlKey];
};

type UseArrowKeyNavigationOptions = {
  isHoldingDownSpace: ComputedRef<boolean>;
  rootEl: Ref<HTMLElement>;
};

export const useArrowKeyNavigation = (
  options: UseArrowKeyNavigationOptions,
) => {
  const { handleSelection } = useArrowKeySelection();
  const { handleMovement } = useArrowKeyMoving();
  const { handleInitialSelection } = useInitialSelection();

  const store = useStore();

  const hasSelectedObjects = () => {
    const selectedObjects = store.getters["selection/selectedObjects"];
    return selectedObjects.length > 0;
  };

  const shouldNavigate = (event: KeyboardEvent) => {
    return !isInputElement(event.target as HTMLElement) && !event.altKey;
  };

  // prevent native events
  const preventNativeEvents = function (event: KeyboardEvent) {
    const isScrollingKey = [
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
      if (!hasSelectedObjects) {
        handleInitialSelection(event);
        return;
      }

      const handler = isMovementEvent(event) ? handleMovement : handleSelection;

      handler(event);
    }
  });

  onMounted(() => {
    options.rootEl.value.addEventListener("keydown", preventNativeEvents);
    options.rootEl.value.addEventListener("keydown", keyboardNavHandler);
  });

  onBeforeUnmount(() => {
    options.rootEl.value.removeEventListener("keydown", preventNativeEvents);
    options.rootEl.value.removeEventListener("keydown", keyboardNavHandler);
  });

  return {
    doInitialSelection: handleInitialSelection,
  };
};
