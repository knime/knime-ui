import { storeToRefs } from "pinia";
import throttle from "raf-throttle";

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

  const zoom = throttle(function (event: WheelEvent) {
    canvasStore.zoomAroundPointer({
      cursorX: event.offsetX,
      cursorY: event.offsetY,
      delta: Math.sign(-event.deltaY) as -1 | 0 | 1,
    });
  });

  const onMouseWheel = (event: WheelEvent) => {
    if (!interactionsEnabled.value || isWorkflowEmpty.value) {
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
      zoom(event);
      return;
    }

    // do a scroll if we don't zoom
    options.scrollPan(event);
  };

  return { onMouseWheel };
};
