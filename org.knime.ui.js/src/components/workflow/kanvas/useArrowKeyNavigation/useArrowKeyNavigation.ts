import { computed, onBeforeUnmount, onMounted, type ComputedRef } from "vue";
import throttle from "raf-throttle";

import { getMetaOrCtrlKey } from "webapps-common/util/navigator";

import { useStore } from "@/composables/useStore";

import { isInputElement } from "@/util/isInputElement";

import { useArrowKeySelection } from "./useArrowKeySelection";
import { useArrowKeyMoving } from "./useArrowKeyMoving";

const isMovementEvent = (event: KeyboardEvent) => {
  const metaOrCtrlKey = getMetaOrCtrlKey();
  return event.shiftKey && event[metaOrCtrlKey];
};

type UseArrowKeyNavigationOptions = {
  isHoldingDownSpace: ComputedRef<boolean>;
};

export const useArrowKeyNavigation = (
  options: UseArrowKeyNavigationOptions,
) => {
  const { handleSelection } = useArrowKeySelection();
  const { handleMovement } = useArrowKeyMoving();

  const store = useStore();
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
