import { computed, onBeforeUnmount, onMounted, ref, type Ref } from "vue";
import throttle from "raf-throttle";

import { isMac } from "webapps-common/util/navigator";
import { useStore } from "@/composables/useStore";
import { isInputElement } from "@/util/isInputElement";
import { isDynamicViewFocused } from "@/components/dynamicViews";

type UsePanningWithSpaceOptions = {
  shouldShowMoveCursor: Ref<boolean>;
  isPanning: Ref<boolean>;
};

const usePanningWithSpace = (options: UsePanningWithSpaceOptions) => {
  const isHoldingDownSpace = ref(false);

  const store = useStore();

  const onPressSpace = (event: KeyboardEvent) => {
    if (isInputElement(event.target as HTMLElement) || isDynamicViewFocused()) {
      return;
    }

    if (event.code !== "Space") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (!isHoldingDownSpace.value) {
      options.shouldShowMoveCursor.value = true;
    }

    isHoldingDownSpace.value = true;
  };

  const onReleaseKey = (event: KeyboardEvent) => {
    if (event.code === "Space") {
      // unset panning state
      options.shouldShowMoveCursor.value = false;
      options.isPanning.value = false;
      isHoldingDownSpace.value = false;
    }

    if (event.code === "Escape") {
      // unset panning state
      options.shouldShowMoveCursor.value = false;
      options.isPanning.value = false;
      store.dispatch("application/resetCanvasMode");
    }

    const metaOrCtrlKey = isMac() ? "Meta" : "Control";

    if (event.key === "Shift" || event.key === metaOrCtrlKey) {
      store.commit("canvas/setIsMoveLocked", false);
    }
  };

  onMounted(() => {
    document.addEventListener("keypress", onPressSpace);
    document.addEventListener("keyup", onReleaseKey);
  });

  onBeforeUnmount(() => {
    document.removeEventListener("keypress", onPressSpace);
    document.removeEventListener("keyup", onReleaseKey);
  });

  return { isHoldingDownSpace };
};

type UsePanningOptions = {
  rootEl: Ref<HTMLElement>;
};

export const usePanning = (options: UsePanningOptions) => {
  const isPanning = ref(false);
  /**
   * determines whether the move cursor will be used. It will also apply the 'panning'
   * class which prevents pointer events on the svg element
   */
  const shouldShowMoveCursor = ref(false);

  const { isHoldingDownSpace } = usePanningWithSpace({
    isPanning,
    shouldShowMoveCursor,
  });

  const isHoldingDownMiddleClick = ref(false);
  const isHoldingDownRightClick = ref(false);

  const panningOffset = ref<[number, number]>([0, 0]);
  let maybePanning = false;
  let initialRightClickPosition: [number, number] = [0, 0];

  const store = useStore();

  const hasPanModeEnabled = computed(
    () => store.getters["application/hasPanModeEnabled"],
  );

  const interactionsEnabled = computed(
    () => store.state.canvas.interactionsEnabled,
  );

  const isWorkflowEmpty = computed(
    () => store.getters["workflow/isWorkflowEmpty"],
  );

  const beginPan = (event: PointerEvent) => {
    if (!interactionsEnabled.value || isWorkflowEmpty.value) {
      return;
    }
    const middleButton = 1;
    const rightButton = 2;

    isHoldingDownMiddleClick.value = event.button === middleButton;
    isHoldingDownRightClick.value = event.button === rightButton;

    // definite pan for these 3 interactions
    if (
      isHoldingDownMiddleClick.value ||
      isHoldingDownSpace.value ||
      hasPanModeEnabled.value
    ) {
      isPanning.value = true;
      shouldShowMoveCursor.value = true;
      panningOffset.value = [event.screenX, event.screenY];
      options.rootEl.value.setPointerCapture(event.pointerId);
    }

    // possibly will pan, but we need to wait further for the user to move
    if (isHoldingDownRightClick.value) {
      maybePanning = true;
      initialRightClickPosition = [event.screenX, event.screenY];
    }
  };

  const movePan = throttle(function (event: PointerEvent) {
    if (isPanning.value) {
      const delta = [
        event.screenX - panningOffset.value[0],
        event.screenY - panningOffset.value[1],
      ];
      panningOffset.value = [event.screenX, event.screenY];
      options.rootEl.value.scrollLeft -= delta[0];
      options.rootEl.value.scrollTop -= delta[1];
    }

    // user could potentially be wanting to pan via right-click
    if (maybePanning) {
      const MOVE_THRESHOLD = 15;
      const deltaX = Math.abs(event.screenX - initialRightClickPosition[0]);
      const deltaY = Math.abs(event.screenY - initialRightClickPosition[1]);

      // only start panning after we cross a certain threshold
      if (deltaX >= MOVE_THRESHOLD || deltaY >= MOVE_THRESHOLD) {
        isPanning.value = true;
        shouldShowMoveCursor.value = true;
        panningOffset.value = [event.screenX, event.screenY];
        options.rootEl.value.setPointerCapture(event.pointerId);

        // clear right-click state
        maybePanning = false;
        initialRightClickPosition = [0, 0];
      }
    }
  });

  const stopPan = (event: PointerEvent) => {
    // user is not panning but did right-clicked
    if (!isPanning.value && isHoldingDownRightClick.value) {
      store.dispatch("application/toggleContextMenu", {
        event,
        deselectAllObjects: true,
      });

      // unset right-click state since we're directly opening the menu instead of panning
      isHoldingDownRightClick.value = false;
      maybePanning = false;

      // stop event here
      event.stopPropagation();
      return;
    }

    if (isPanning.value) {
      isPanning.value = false;
      panningOffset.value = [0, 0];
      options.rootEl.value.releasePointerCapture(event.pointerId);
      event.stopPropagation();
    }

    // reset all states
    isHoldingDownRightClick.value = false;
    isHoldingDownMiddleClick.value = false;
    maybePanning = false;

    // move cursor should remain set if the user is still holding down the space key
    shouldShowMoveCursor.value = isHoldingDownSpace.value;
  };

  const windowBlurListener = () => {
    // unset panning state
    shouldShowMoveCursor.value = false;
    isPanning.value = false;
    isHoldingDownSpace.value = false;

    // unset move-lock state
    store.commit("canvas/setIsMoveLocked", false);
  };

  onMounted(() => {
    window.addEventListener("blur", windowBlurListener);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("blur", windowBlurListener);
  });

  return {
    shouldShowMoveCursor,
    isPanning,
    beginPan,
    movePan,
    stopPan,
  };
};
