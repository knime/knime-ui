import { type Ref, computed, onBeforeUnmount, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import throttle from "raf-throttle";

import { navigatorUtils } from "@knime/utils";

import { isUIExtensionFocused } from "@/components/uiExtensions";
import { runInEnvironment } from "@/environment";
import { useApplicationStore } from "@/store/application/application";
import { useCanvasModesStore } from "@/store/application/canvasModes";
import { useCanvasStore } from "@/store/canvas";
import { useSettingsStore } from "@/store/settings";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { isInputElement } from "@/util/isInputElement";

type UsePanningWithSpaceOptions = {
  shouldShowMoveCursor: Ref<boolean>;
  isPanning: Ref<boolean>;
};

const usePanningWithSpace = (options: UsePanningWithSpaceOptions) => {
  const isHoldingDownSpace = ref(false);
  const { setIsMoveLocked } = useCanvasStore();
  const { resetCanvasMode } = useCanvasModesStore();

  const onPressSpace = (event: KeyboardEvent) => {
    if (isInputElement(event.target as HTMLElement) || isUIExtensionFocused()) {
      return;
    }

    // do not handle space if a modifier is used
    if (event.code !== "Space" || event.ctrlKey || event.metaKey) {
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
      resetCanvasMode();
    }

    const metaOrCtrlKey = navigatorUtils.isMac() ? "Meta" : "Control";

    if (event.key === "Shift" || event.key === metaOrCtrlKey) {
      setIsMoveLocked(false);
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
  let elemScroll: [number, number] = [0, 0];

  const { hasPanModeEnabled } = storeToRefs(useCanvasModesStore());
  const canvasStore = useCanvasStore();
  const { interactionsEnabled } = storeToRefs(canvasStore);
  const { isWorkflowEmpty } = storeToRefs(useWorkflowStore());
  const { settings } = storeToRefs(useSettingsStore());
  const { toggleContextMenu } = useApplicationStore();

  const beginPan = (event: PointerEvent) => {
    canvasStore.focus();

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
      elemScroll = [
        options.rootEl.value.scrollLeft,
        options.rootEl.value.scrollTop,
      ];
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

      // adjust the delta values for the current zoomlevel
      // the factor is currently only known in desktop mode
      runInEnvironment({
        DESKTOP: () => {
          delta[0] /= settings.value.uiScale;
          delta[1] /= settings.value.uiScale;
        },
      });

      // with fractional scaling, elemScroll can retain floating-point precision,
      // allowing fractions to accumulate and thereby preventing cursor drift
      elemScroll[0] -= delta[0];
      elemScroll[1] -= delta[1];

      options.rootEl.value.scrollLeft = elemScroll[0];
      options.rootEl.value.scrollTop = elemScroll[1];
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
        elemScroll = [
          options.rootEl.value.scrollLeft,
          options.rootEl.value.scrollTop,
        ];

        // clear right-click state
        maybePanning = false;
        initialRightClickPosition = [0, 0];
      }
    }
  });

  const stopPan = (event: PointerEvent) => {
    // user is not panning but did right-clicked
    if (!isPanning.value && isHoldingDownRightClick.value) {
      toggleContextMenu({
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
    canvasStore.setIsMoveLocked(false);
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
    isHoldingDownSpace: computed(() => isHoldingDownSpace.value),
  };
};
