import { type Ref, computed } from "vue";
import throttle from "raf-throttle";

import { navigatorUtils } from "@knime/utils";

import { useStore } from "@/composables/useStore";

type UseZoomOptions = {
  rootEl: Ref<HTMLElement>;
};

export const useMouseWheelZooming = (options: UseZoomOptions) => {
  const store = useStore();

  const scrollToZoomEnabled = computed(
    () => store.state.application.scrollToZoomEnabled,
  );

  const interactionsEnabled = computed(
    () => store.state.canvas.interactionsEnabled,
  );

  const isWorkflowEmpty = computed(
    () => store.getters["workflow/isWorkflowEmpty"],
  );

  const zoom = throttle(function (e) {
    // delta is -1, 0 or 1 depending on scroll direction.
    const delta = Math.sign(-e.deltaY);

    // get mouse cursor position on canvas
    const bcr = options.rootEl.value.getBoundingClientRect();
    const cursorX = e.clientX - bcr.x;
    const cursorY = e.clientY - bcr.y;

    store.dispatch("canvas/zoomAroundPointer", { delta, cursorX, cursorY });
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
