import type { Ref } from "vue";
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import type { FederatedPointerEvent } from "pixi.js";
import { type ApplicationInst } from "vue3-pixi";

import type { XY } from "@/api/gateway-api/generated-api";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useMovingStore } from "@/store/workflow/moving";

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

  const beginPan = (event: PointerEvent) => {
    const isMouseLeftClick = event.button === 0;
    if (isMouseLeftClick) {
      return;
    }

    if (isDragging.value) {
      return;
    }

    isPanning.value = true;
    panLastPosition.value = { x: event.offsetX, y: event.offsetY };

    const onPan = (event: FederatedPointerEvent) => {
      if (isPanning.value) {
        canvasStore.setCanvasOffset({
          x: stage.value.x + (event.global.x - (panLastPosition.value?.x ?? 0)),
          y: stage.value.y + (event.global.y - (panLastPosition.value?.y ?? 0)),
        });

        panLastPosition.value = { x: event.global.x, y: event.global.y };

        canvasStore.updateStageHitArea();
      }
    };

    const stopPan = () => {
      isPanning.value = false;
      panLastPosition.value = null;

      stage.value.off("pointermove", onPan);
      stage.value.off("pointerup", stopPan);
      stage.value.off("pointerupoutside", stopPan);
    };

    stage.value.on("pointermove", onPan);
    stage.value.on("pointerup", stopPan);
    stage.value.on("pointerupoutside", stopPan);
  };

  return { beginPan };
};
