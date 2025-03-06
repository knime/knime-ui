import type { Ref } from "vue";
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import throttle from "raf-throttle";

import type { XY } from "@/api/gateway-api/generated-api";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useMovingStore } from "@/store/workflow/moving";
import { type ApplicationInst } from "@/vue3-pixi";

export const useCanvasPanning = ({
  pixiApp,
}: {
  pixiApp: Ref<ApplicationInst>;
}) => {
  const isPanning = ref(false);
  const panLastPosition = ref<XY | null>({ x: 0, y: 0 });

  const canvasStore = useWebGLCanvasStore();
  const stage = computed(() => pixiApp.value.app.stage);

  const { isDragging } = storeToRefs(useMovingStore());

  const mousePan = (pointerDownEvent: PointerEvent) => {
    const { canvas } = pixiApp.value;

    const isMouseLeftClick = pointerDownEvent.button === 0;
    if (isMouseLeftClick) {
      return;
    }

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

    const onPan = (ptrMoveEvent: PointerEvent) => {
      if (isPanning.value) {
        canvasStore.setCanvasOffset({
          x:
            stage.value.x +
            (ptrMoveEvent.offsetX - (panLastPosition.value?.x ?? 0)),
          y:
            stage.value.y +
            (ptrMoveEvent.offsetY - (panLastPosition.value?.y ?? 0)),
        });

        panLastPosition.value = {
          x: ptrMoveEvent.offsetX,
          y: ptrMoveEvent.offsetY,
        };
      }
    };

    const stopPan = () => {
      isPanning.value = false;
      panLastPosition.value = null;
      canvas.removeEventListener("pointermove", onPan);
      canvas.removeEventListener("pointerup", stopPan);
      canvas.removeEventListener("lostpointercapture", stopPan);
      if (eventTarget.hasPointerCapture(pointerDownEvent.pointerId)) {
        eventTarget.releasePointerCapture(pointerDownEvent.pointerId);
      }
    };

    canvas.addEventListener("pointermove", onPan);
    canvas.addEventListener("pointerup", stopPan);
    canvas.addEventListener("lostpointercapture", stopPan);
  };

  const scrollPan = throttle((event: WheelEvent) => {
    if (!stage.value) {
      return;
    }

    // invert xy on shift key (allows to scroll horizontally)
    if (event.shiftKey) {
      canvasStore.setCanvasOffset({
        x: stage.value.x - event.deltaY,
        y: stage.value.y - event.deltaX,
      });
      return;
    }

    canvasStore.setCanvasOffset({
      x: stage.value.x - event.deltaX,
      y: stage.value.y - event.deltaY,
    });
  });

  return { mousePan, scrollPan };
};
