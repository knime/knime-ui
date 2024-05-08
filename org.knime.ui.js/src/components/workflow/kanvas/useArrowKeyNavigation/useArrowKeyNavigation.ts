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
  const { handleSelection } = useArrowKeySelection({
    rootEl: options.rootEl,
  });
  const { handleMovement } = useArrowKeyMoving({
    rootEl: options.rootEl,
  });
  const { handleInitialSelection } = useInitialSelection();

  const store = useStore();

  const hasSelectedObjects = () => {
    const selectedObjects = store.getters["selection/selectedObjects"];
    return selectedObjects.length > 0;
  };

  const isInitialSelectionEvent = (event: KeyboardEvent) => {
    return (
      !hasSelectedObjects() &&
      !event.shiftKey &&
      !event[getMetaOrCtrlKey()] &&
      store.state.selection.focusedObject === null
    );
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
      // no objects are selected and no modifiers are used and nothing is focused -> initial selection
      if (isInitialSelectionEvent(event)) {
        handleInitialSelection(event);
        return;
      }

      // movements
      if (isMovementEvent(event)) {
        handleMovement(event);
        return;
      }

      handleSelection(event);
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
