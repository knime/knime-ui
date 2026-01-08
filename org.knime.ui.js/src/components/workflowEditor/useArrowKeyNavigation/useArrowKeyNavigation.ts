import { type ComputedRef, type Ref, onMounted } from "vue";
import { useEventListener } from "@vueuse/core";
import { storeToRefs } from "pinia";
import throttle from "raf-throttle";

import { getMetaOrCtrlKey } from "@knime/utils";

import { useCanvasModesStore } from "@/store/application/canvasModes";
import { useSelectionStore } from "@/store/selection";
import { isInputElement } from "@/util/dom";

import { useArrowKeyMoving } from "./useArrowKeyMoving";
import { useArrowKeyPanning } from "./useArrowKeyPanning";
import { useArrowKeySelection } from "./useArrowKeySelection";
import { useInitialSelection } from "./useInitialSelection";

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

  const { hasPanModeEnabled } = storeToRefs(useCanvasModesStore());

  const { handlePanning } = useArrowKeyPanning();

  const selectionStore = useSelectionStore();
  const { selectedObjects, getFocusedObject, activeNodePorts } =
    storeToRefs(selectionStore);

  const hasSelectedObjects = () => {
    return selectedObjects.value.length > 0;
  };

  const isInitialSelectionEvent = (event: KeyboardEvent) => {
    return (
      !hasSelectedObjects() &&
      !event.shiftKey &&
      !event[getMetaOrCtrlKey()] &&
      getFocusedObject.value === null
    );
  };

  const shouldNavigate = (event: KeyboardEvent) => {
    return (
      !isInputElement(event.target as HTMLElement) &&
      !event.altKey &&
      !activeNodePorts.value.selectedPort
    );
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

  const keyboardNavHandler = throttle(async (event: KeyboardEvent) => {
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
      // in pan mode we should pan with arrow keys
      if (hasPanModeEnabled.value) {
        handlePanning(event);
        return;
      }

      // no objects are selected and no modifiers are used and nothing is focused -> initial selection
      if (isInitialSelectionEvent(event)) {
        await handleInitialSelection(event);
        return;
      }

      // movements
      if (isMovementEvent(event)) {
        handleMovement(event);
        return;
      }

      const { wasAborted } =
        await selectionStore.promptUserAboutClearingSelection();
      if (wasAborted) {
        return;
      }

      handleSelection(event);
    }
  });

  onMounted(() => {
    useEventListener(options.rootEl, "keydown", preventNativeEvents);
    useEventListener(options.rootEl, "keydown", keyboardNavHandler);
  });

  return {
    doInitialSelection: handleInitialSelection,
  };
};
