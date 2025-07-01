<!-- eslint-disable func-style -->
<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
import { storeToRefs } from "pinia";
import type { FederatedPointerEvent, Graphics } from "pixi.js";

import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { clamp } from "@/util/clamp";
import { markEventAsHandled } from "../util/interaction";

const sizeRatio = 0.15;
const edgeOffset = 20;

const canvasStore = useWebGLCanvasStore();

const {
  containerSize,
  canvasOffset,
  zoomFactor,
  contentBounds2: contentBounds,
} = storeToRefs(canvasStore);

const worldBounds = computed(() => contentBounds.value);

const minimapBounds = computed(() => {
  const containerWidth = containerSize.value.width;
  const containerHeight = containerSize.value.height;

  const width = containerWidth * sizeRatio;
  const height = containerHeight * sizeRatio;

  return {
    x: containerWidth - width - edgeOffset,
    y: containerHeight - height - edgeOffset,

    width,
    height,
  };
});

const minimapScaling = computed(() => ({
  x: minimapBounds.value.width / worldBounds.value.width,
  y: minimapBounds.value.height / worldBounds.value.height,
}));

const camera = computed(() => {
  const viewWidth = containerSize.value.width / zoomFactor.value;
  const viewHeight = containerSize.value.height / zoomFactor.value;
  const cameraWorldX = -canvasOffset.value.x / zoomFactor.value;
  const cameraWorldY = -canvasOffset.value.y / zoomFactor.value;

  const rectWidth = viewWidth * minimapScaling.value.x;
  const rectHeight = viewHeight * minimapScaling.value.y;

  const offsetX =
    (cameraWorldX - worldBounds.value.left) * minimapScaling.value.x;
  const offsetY =
    (cameraWorldY - worldBounds.value.top) * minimapScaling.value.y;

  const miniCameraRect = {
    x: clamp(offsetX, 0, minimapBounds.value.width - rectWidth),
    y: clamp(offsetY, 0, minimapBounds.value.height - rectHeight),
    width: rectWidth,
    height: rectHeight,
  };

  return miniCameraRect;
});

const cameraGraphicsRef = useTemplateRef<Graphics>("cameraGraphicsRef");

const onCameraPointerdown = (pointerdown: FederatedPointerEvent) => {
  markEventAsHandled(pointerdown, { initiator: "minimap-panning" });

  const isOutOfBounds = (move: PointerEvent) => {
    return (
      move.offsetX < minimapBounds.value.x ||
      move.offsetX > minimapBounds.value.x + minimapBounds.value.width ||
      move.offsetY < minimapBounds.value.y ||
      move.offsetY > minimapBounds.value.y + minimapBounds.value.height
    );
  };

  const canvas = canvasStore.pixiApplication!.canvas;
  canvas.setPointerCapture(pointerdown.pointerId);

  let lastPan = {
    x: pointerdown.clientX,
    y: pointerdown.clientY,
  };

  function teardown() {
    // eslint-disable-next-line no-use-before-define
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerup", teardown);
    canvas.releasePointerCapture(pointerdown.pointerId);
  }

  function onMove(pointermove: PointerEvent) {
    if (isOutOfBounds(pointermove)) {
      teardown();
      return;
    }

    const deltaX =
      ((pointermove.clientX - lastPan.x) / minimapScaling.value.x) *
      zoomFactor.value;
    const deltaY =
      ((pointermove.clientY - lastPan.y) / minimapScaling.value.y) *
      zoomFactor.value;

    canvasStore.setCanvasOffset({
      x: canvasOffset.value.x + deltaX * -1,
      y: canvasOffset.value.y + deltaY * -1,
    });

    lastPan.x = pointermove.clientX;
    lastPan.y = pointermove.clientY;
  }

  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", teardown);
};
</script>

<template>
  <Container :position="minimapBounds">
    <Graphics
      @render="
        (graphics) => {
          graphics.clear();
          graphics.rect(0, 0, minimapBounds.width, minimapBounds.height);
          graphics.stroke({ width: 1, color: 0x000000 });
          graphics.fill('white');
        }
      "
    />

    <Graphics
      ref="cameraGraphicsRef"
      event-mode="static"
      @pointerdown="onCameraPointerdown"
      @render="
        (graphics) => {
          graphics.clear();
          graphics.rect(camera.x, camera.y, camera.width, camera.height);
          graphics.stroke({ width: 1, color: 'blue' });
          graphics.fill({ alpha: 0 });
        }
      "
    />
  </Container>
</template>
