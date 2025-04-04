import type { Ref } from "vue";
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import throttle from "raf-throttle";

import type { XY } from "@/api/gateway-api/generated-api";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useCanvasAnchoredComponentsStore } from "@/store/canvasAnchoredComponents/canvasAnchoredComponents";
import { useSelectionStore } from "@/store/selection";
import { useMovingStore } from "@/store/workflow/moving";
import { type ApplicationInst } from "@/vue3-pixi";

export const useCanvasPanning = ({
  pixiApp,
}: {
  pixiApp: Ref<ApplicationInst>;
}) => {
  const isPanning = ref(false);
  const hasMoved = ref(false);
  const panLastPosition = ref<XY | null>({ x: 0, y: 0 });

  const { toggleContextMenu } = useCanvasAnchoredComponentsStore();

  const canvasStore = useWebGLCanvasStore();
  const stage = computed(() => pixiApp.value.app.stage);

  const { isDragging } = storeToRefs(useMovingStore());

  const mousePan = (pointerDownEvent: PointerEvent) => {
    consola.debug("Kanvas::usePanning - startPan", { pointerDownEvent });
    const { canvas } = pixiApp.value;

    const isMouseLeftClick = pointerDownEvent.button === 0;
    if (isMouseLeftClick || isDragging.value) {
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
      if (isPanning.value) {
        hasMoved.value = true;
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
    });

    const stopPan = (pointerUpEvent: PointerEvent) => {
      consola.debug("Kanvas::usePanning - stopPan", { pointerUpEvent });

      const isUnhandledEvent = !pointerUpEvent.dataset;
      // show global context menu if we did not move
      // right click on other objects should prevent the event so its not getting here (see mousePan)
      if (!hasMoved.value && isUnhandledEvent) {
        const [x, y] = useWebGLCanvasStore().toCanvasCoordinates([
          pointerUpEvent.offsetX,
          pointerUpEvent.offsetY,
        ]);
        canvasStore.setCanvasAnchor({
          isOpen: true,
          anchor: { x, y },
        });
        useSelectionStore().deselectAllObjects();
        toggleContextMenu();
      }

      // cleanup
      isPanning.value = false;
      hasMoved.value = false;
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
