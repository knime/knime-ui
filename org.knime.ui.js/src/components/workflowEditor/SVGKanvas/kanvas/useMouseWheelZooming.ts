import { type Ref } from "vue";
import { storeToRefs } from "pinia";
import throttle from "raf-throttle";

import { navigatorUtils } from "@knime/utils";

import { useApplicationSettingsStore } from "@/store/application/settings";
import { useCanvasStore } from "@/store/canvas";
import { useWorkflowStore } from "@/store/workflow/workflow";

type UseZoomOptions = {
  rootEl: Ref<HTMLElement>;
};

export const useMouseWheelZooming = (options: UseZoomOptions) => {
  const { scrollToZoomEnabled } = storeToRefs(useApplicationSettingsStore());
  const canvasStore = useCanvasStore();
  const { interactionsEnabled } = storeToRefs(canvasStore);
  const { isWorkflowEmpty } = storeToRefs(useWorkflowStore());

  const zoom = throttle(function (e) {
    // delta is -1, 0 or 1 depending on scroll direction.
    const delta = Math.sign(-e.deltaY) as -1 | 0 | 1;

    // get mouse cursor position on canvas
    const bcr = options.rootEl.value.getBoundingClientRect();
    const cursorX = e.clientX - bcr.x;
    const cursorY = e.clientY - bcr.y;

    canvasStore.zoomAroundPointer({ delta, cursorX, cursorY });
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
    if (!shouldZoom) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    // we can only throttle the zoom function itself and not the event propagation,
    // otherwise we can get a mix of zooming and scrolling because some events
    // are propagated and some are not
    zoom(event);
  };

  return { onMouseWheel };
};
