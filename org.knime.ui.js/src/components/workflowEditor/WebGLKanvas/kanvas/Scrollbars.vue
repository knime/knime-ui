<script lang="ts" setup>
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import type { ColorSource, FederatedPointerEvent } from "pixi.js";

import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { type GraphicsInst } from "@/vue3-pixi";
import { markEventAsHandled } from "../util/interaction";

type Props = {
  size?: number;
  background?: ColorSource;
  foreground?: ColorSource;
};

withDefaults(defineProps<Props>(), {
  size: 6,
  background: 14540253,
  foreground: 8947848,
});

const canvasStore = useWebGLCanvasStore();

const { canvasOffset, containerSize, contentBounds, zoomFactor } =
  storeToRefs(canvasStore);

const verticalLength = computed(() => 150);
const horizontalLength = computed(() => 150);

const verticalOffset = computed(() => {
  return (
    canvasOffset.value.y +
    contentBounds.value.centerY * zoomFactor.value -
    verticalLength.value / 2
  );
});

const horizontalOffset = computed(() => {
  return (
    canvasOffset.value.x +
    contentBounds.value.centerX * zoomFactor.value -
    horizontalLength.value / 2
  );
});

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
          x: canvasOffset.value.x + deltaX,
          y: canvasOffset.value.y,
        });
        startPos.value.x += deltaX;
      }
      if (direction === "vertical") {
        canvasStore.setCanvasOffset({
          x: canvasOffset.value.x,
          y: canvasOffset.value.y + deltaY,
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
            containerSize.height - size,
            containerSize.width,
            size,
          );
          graphics.fill(background);
          graphics.rect(
            horizontalOffset,
            containerSize.height - size,
            horizontalLength,
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
            containerSize.width - size,
            0,
            size,
            containerSize.height,
          );
          graphics.fill(background);
          graphics.rect(
            containerSize.width - size,
            verticalOffset,
            size,
            verticalLength,
          );
          graphics.fill(foreground);
        }
      "
    />
  </Container>
</template>
