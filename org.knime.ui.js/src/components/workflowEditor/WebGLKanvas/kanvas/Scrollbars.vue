<!-- eslint-disable no-magic-numbers -->
<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import { clamp } from "lodash-es";
import { storeToRefs } from "pinia";
import type { ColorSource, FederatedPointerEvent } from "pixi.js";

import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { type GraphicsInst } from "@/vue3-pixi";
import { markEventAsHandled } from "../util/interaction";

type Props = {
  size?: number;
  minLength?: number;
  background?: ColorSource;
  foreground?: ColorSource;
};

const props = withDefaults(defineProps<Props>(), {
  size: 6,
  minLength: 20,
  background: 14540253,
  foreground: 8947848,
});

const canvasStore = useWebGLCanvasStore();

const {
  canvasOffset,
  containerSize: scollbarSize,
  paddedScrollBounds: virtualSheet,
  viewBox,
  zoomFactor,
} = storeToRefs(canvasStore);

const scrollbarHeight = ref(10);
const scrollbarWidth = ref(10);

const scrollbarLeft = ref(0);
const scrollbarTop = ref(0);

//  move the origin (0,0) to the center of the content bounds (workflow bounds + scroll padding)
const sheetOriginOffset = computed(() => ({
  x: (canvasOffset.value.x + virtualSheet.value.left) * zoomFactor.value,
  y: (canvasOffset.value.y + virtualSheet.value.top) * zoomFactor.value,
}));

watch(
  [sheetOriginOffset, virtualSheet, viewBox, scollbarSize],
  ([offset, sheet, box, scrollbar]) => {
    scrollbarHeight.value = clamp(
      (box.height / sheet.height) * box.height,
      props.minLength,
      scrollbar.height * 0.6,
    );
    scrollbarWidth.value = clamp(
      (box.width / sheet.width) * box.width,
      props.minLength,
      scrollbar.width * 0.6,
    );

    scrollbarLeft.value = clamp(
      (-offset.x / sheet.width) * box.width,
      0,
      scrollbar.width - scrollbarWidth.value,
    );
    scrollbarTop.value = clamp(
      (-offset.y / sheet.height) * box.height,
      0,
      scrollbar.height - scrollbarHeight.value,
    );
  },
  { immediate: true, deep: true },
);

// handle pointer events
const startPos = ref({ x: 0, y: 0 });

const calculateMoveDeltas = (pointerMoveEvent: PointerEvent) => {
  const deltaX =
    (pointerMoveEvent.offsetX - startPos.value.x) / zoomFactor.value;
  const deltaY =
    (pointerMoveEvent.offsetY - startPos.value.y) / zoomFactor.value;

  return { deltaX, deltaY };
};

const handlePointerDown =
  (direction: "horizontal" | "vertical") =>
  (pointerDownEvent: FederatedPointerEvent) => {
    markEventAsHandled(pointerDownEvent, {
      initiator: `scrollbar-${direction}`,
      skipGlobalSelection: true,
    });

    // TODO: do also move on click (up without move)

    startPos.value = {
      x: pointerDownEvent.global.x,
      y: pointerDownEvent.global.y,
    };

    const canvas = canvasStore.pixiApplication!.app.canvas;
    canvas.setPointerCapture(pointerDownEvent.pointerId);

    const onMove = (pointerMoveEvent: PointerEvent): void => {
      const { deltaX, deltaY } = calculateMoveDeltas(pointerMoveEvent);

      if (direction === "horizontal") {
        canvasStore.setCanvasOffset({
          x: canvasOffset.value.x - deltaX,
          y: canvasOffset.value.y,
        });
        startPos.value.x += deltaX;
      }
      if (direction === "vertical") {
        canvasStore.setCanvasOffset({
          x: canvasOffset.value.x,
          y: canvasOffset.value.y - deltaY,
        });
        startPos.value.y += deltaY;
      }
    };

    const onUp = () => {
      markEventAsHandled(pointerDownEvent, {
        initiator: `scrollbar-${direction}`,
      });

      startPos.value = { x: 0, y: 0 };

      canvas.releasePointerCapture(pointerDownEvent.pointerId);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
    };

    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
  };

const pointerDownHorizontal = handlePointerDown("horizontal");
const pointerDownVertical = handlePointerDown("vertical");
</script>

<template>
  <Container>
    <Graphics
      label="HorizonalScrollbar"
      event-mode="static"
      @pointerdown="pointerDownHorizontal"
      @render="
        (graphics: GraphicsInst) => {
          graphics.clear();
          graphics.rect(
            0,
            scollbarSize.height - size,
            scollbarSize.width,
            size,
          );
          graphics.fill(background);
          graphics.rect(
            scrollbarLeft,
            scollbarSize.height - size,
            scrollbarWidth,
            size,
          );
          graphics.fill(foreground);
        }
      "
    />
    <Graphics
      label="VerticalScrollbar"
      event-mode="static"
      @pointerdown="pointerDownVertical"
      @render="
        (graphics: GraphicsInst) => {
          graphics.clear();
          graphics.rect(
            scollbarSize.width - size,
            0,
            size,
            scollbarSize.height,
          );
          graphics.fill(background);
          graphics.rect(
            scollbarSize.width - size,
            scrollbarTop,
            size,
            scrollbarHeight,
          );
          graphics.fill(foreground);
        }
      "
    />
  </Container>
</template>
