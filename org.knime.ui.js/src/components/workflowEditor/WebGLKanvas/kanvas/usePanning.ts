import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import throttle from "raf-throttle";

import { isModifierKeyPressed, navigatorUtils } from "@knime/utils";

import type { XY } from "@/api/gateway-api/generated-api";
import { isUIExtensionFocused } from "@/components/uiExtensions";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useCanvasAnchoredComponentsStore } from "@/store/canvasAnchoredComponents/canvasAnchoredComponents";
import { useSelectionStore } from "@/store/selection";
import { useMovingStore } from "@/store/workflow/moving";
import { getKanvasDomElement } from "@/util/getKanvasDomElement";
import { isInputElement } from "@/util/isInputElement";
import { pixiGlobals } from "../common/pixiGlobals";
import { isMarkedEvent } from "../util/interaction";

const useHoldingDownSpace = () => {
  const { isHoldingDownSpace, isPanning } = storeToRefs(useWebGLCanvasStore());

  const onPressSpace = (event: KeyboardEvent) => {
    if (
      isInputElement(event.target as HTMLElement) ||
      isUIExtensionFocused() ||
      getKanvasDomElement() !== document.activeElement
    ) {
      return;
    }

    // do not handle space if a modifier is used
    if (event.code !== "Space" || isModifierKeyPressed(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    isHoldingDownSpace.value = true;
  };

  const onReleaseKey = (event: KeyboardEvent) => {
    if (event.code === "Space" || event.code === "Escape") {
      // unset panning state
      isPanning.value = false;
      isHoldingDownSpace.value = false;
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
};

export const useCanvasPanning = () => {
  const { isPanning, isHoldingDownSpace } = storeToRefs(useWebGLCanvasStore());
  const hasMoved = ref(false);
  const panLastPosition = ref<XY | null>({ x: 0, y: 0 });

  useHoldingDownSpace();

  const shouldShowMoveCursor = computed(() => {
    return isPanning.value || isHoldingDownSpace.value;
  });

  const { toggleContextMenu } = useCanvasAnchoredComponentsStore();

  const canvasStore = useWebGLCanvasStore();

  const { isDragging } = storeToRefs(useMovingStore());

  const mousePan = (pointerDownEvent: PointerEvent) => {
    consola.debug("Kanvas::usePanning - startPan", { pointerDownEvent });
    const canvas = pixiGlobals.getCanvas();

    if (isDragging.value) {
      return;
    }

    isPanning.value = true;
    panLastPosition.value = {
      x: pointerDownEvent.offsetX,
      y: pointerDownEvent.offsetY,
    };

    const eventTarget = pointerDownEvent.currentTarget as HTMLElement;
    eventTarget.setPointerCapture(pointerDownEvent.pointerId);

    const onPan = throttle((ptrMoveEvent: PointerEvent) => {
      if (!pixiGlobals.hasMainContainer()) {
        consola.warn(
          "usePanning:: tried to pan but main pixi container was not available",
        );
        return;
      }
      const mainContainer = pixiGlobals.getMainContainer();

      if (isPanning.value) {
        hasMoved.value = true;

        // prevent interaction with other canvas objects while in the panning state
        if (canvasStore.interactionsEnabled === "all") {
          canvasStore.setInteractionsEnabled("none");
        }

        canvasStore.setCanvasOffset({
          x:
            mainContainer.x +
            (ptrMoveEvent.offsetX - (panLastPosition.value?.x ?? 0)),
          y:
            mainContainer.y +
            (ptrMoveEvent.offsetY - (panLastPosition.value?.y ?? 0)),
        });

        panLastPosition.value = {
          x: ptrMoveEvent.offsetX,
          y: ptrMoveEvent.offsetY,
        };
      }
    });

    const stopPan = async (pointerUpEvent: PointerEvent) => {
      consola.debug("Kanvas::usePanning - stopPan", { pointerUpEvent });

      // cleanup
      isPanning.value = false;
      panLastPosition.value = null;
      canvas.removeEventListener("pointermove", onPan);
      canvas.removeEventListener("pointerup", stopPan);
      canvas.removeEventListener("lostpointercapture", stopPan);
      if (eventTarget.hasPointerCapture(pointerDownEvent.pointerId)) {
        eventTarget.releasePointerCapture(pointerDownEvent.pointerId);
      }

      const isMouseRightClick = pointerUpEvent.button === 2;
      const isUnhandledEvent = !isMarkedEvent(pointerUpEvent);
      // show global context menu if we did not move
      // right click on other objects should prevent the event so its not getting here (see mousePan)
      if (
        !hasMoved.value &&
        isMouseRightClick &&
        isUnhandledEvent &&
        canvasStore.interactionsEnabled === "all"
      ) {
        hasMoved.value = false;

        const { wasAborted } = await useSelectionStore().tryClearSelection();
        if (wasAborted) {
          return;
        }
        await toggleContextMenu({ event: pointerUpEvent });
      }

      if (canvasStore.interactionsEnabled === "none") {
        canvasStore.setInteractionsEnabled("all");
      }
      hasMoved.value = false;
    };

    canvas.addEventListener("pointermove", onPan);
    canvas.addEventListener("pointerup", stopPan);
    canvas.addEventListener("lostpointercapture", stopPan);
  };

  const scrollPan = throttle((event: WheelEvent) => {
    if (!pixiGlobals.hasMainContainer()) {
      return;
    }

    const mainContainer = pixiGlobals.getMainContainer();

    // Invert xy when Shift key is pressed, to allow horizontal scroll.
    // This is not necessary on Mac, where it works automatically.
    if (event.shiftKey && !navigatorUtils.isMac()) {
      canvasStore.setCanvasOffset({
        x: mainContainer.x - event.deltaY,
        y: mainContainer.y - event.deltaX,
      });
      return;
    }

    canvasStore.setCanvasOffset({
      x: mainContainer.x - event.deltaX,
      y: mainContainer.y - event.deltaY,
    });
  });

  return { mousePan, scrollPan, shouldShowMoveCursor };
};
