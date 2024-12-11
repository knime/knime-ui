import { computed, ref } from "vue";
import type { FederatedPointerEvent } from "pixi.js";

import type { XY } from "@/api/gateway-api/generated-api";
import { useStore } from "@/composables/useStore";

export const useCanvasPanning = () => {
  const isPanning = ref(false);
  const panLastPosition = ref<XY | null>({ x: 0, y: 0 });

  const store = useStore();
  const stage = computed(() => store.state.canvasWebGL.stage);
  const isDragging = computed(() => store.state.workflow.isDragging);

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
        store.commit("canvasWebGL/setCanvasOffset", {
          x:
            stage.value!.x + (event.global.x - (panLastPosition.value?.x ?? 0)),
          y:
            stage.value!.y + (event.global.y - (panLastPosition.value?.y ?? 0)),
        });

        panLastPosition.value = { x: event.global.x, y: event.global.y };

        store.dispatch("canvasWebGL/updateStageHitArea");
      }
    };

    const stopPan = () => {
      isPanning.value = false;
      panLastPosition.value = null;

      stage.value!.off("pointermove", onPan);
      stage.value!.off("pointerup", stopPan);
      stage.value!.off("pointerupoutside", stopPan);
    };

    stage.value!.on("pointermove", onPan);
    stage.value!.on("pointerup", stopPan);
    stage.value!.on("pointerupoutside", stopPan);
  };

  return { beginPan };
};
