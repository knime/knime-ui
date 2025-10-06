import { storeToRefs } from "pinia";

import { navigatorUtils } from "@knime/utils";

import { useApplicationSettingsStore } from "@/store/application/settings";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useWorkflowStore } from "@/store/workflow/workflow";

import type { useCanvasPanning } from "./usePanning";

type UseMouseWheelOptions = {
  scrollPan: ReturnType<typeof useCanvasPanning>["scrollPan"];
};

export const useMouseWheel = (options: UseMouseWheelOptions) => {
  const canvasStore = useWebGLCanvasStore();
  const { interactionsEnabled } = storeToRefs(canvasStore);
  const { isWorkflowEmpty } = storeToRefs(useWorkflowStore());
  const { scrollToZoomEnabled } = storeToRefs(useApplicationSettingsStore());

  let frameId: number | null = null;
  let accumulatedDelta = 0;
  let cursorPosition: { x: number; y: number } | null = null;

  const applyZoomOnNextFrame = () => {
    if (frameId !== null) {
      return;
    }

    frameId = requestAnimationFrame(() => {
      const delta = accumulatedDelta;
      accumulatedDelta = 0;
      frameId = null;
      if (!cursorPosition) {
        return;
      }

      canvasStore.zoomAroundPointerWithSensitivity({
        delta,
        cursorX: cursorPosition.x,
        cursorY: cursorPosition.y,
      });
    });
  };

  const onMouseWheel = (event: WheelEvent) => {
    if (interactionsEnabled.value === "none" || isWorkflowEmpty.value) {
      return;
    }

    // If we don't want to use the wheel to zoom by default,
    // we still want to zoom on ctrl or meta key.
    // Note: The pinch-to-zoom gesture on Mac causes a wheel event with ctrlKey=True,
    //       so we need to check for it to obtain zoom on pinch-to-zoom.
    const shouldZoom =
      scrollToZoomEnabled.value ||
      event.ctrlKey ||
      (navigatorUtils.isMac() && event.metaKey);

    if (shouldZoom) {
      cursorPosition = { x: event.offsetX, y: event.offsetY };

      const delta = event.shiftKey ? event.deltaX : event.deltaY;
      accumulatedDelta += delta;

      applyZoomOnNextFrame();
      return;
    }

    // do a scroll if we don't zoom
    options.scrollPan(event);
  };

  return { onMouseWheel };
};
