<!-- eslint-disable func-style -->
<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
import { storeToRefs } from "pinia";
import type { FederatedPointerEvent, Graphics } from "pixi.js";

import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import * as $shapes from "@/style/shapes";
import { clamp } from "@/util/clamp";
import { markEventAsHandled } from "../util/interaction";

import MiniPreview from "./MiniPreview.vue";

const sizeRatio = 0.15;
const padding = 4;
const rightOffset = $shapes.floatingCanvasToolsBottomOffset;
const bottomOffset =
  $shapes.floatingCanvasToolsBottomOffset +
  $shapes.floatingCanvasToolsSize +
  padding;

const canvasStore = useWebGLCanvasStore();

const { containerSize, canvasOffset, zoomFactor, maxWorldContentBounds } =
  storeToRefs(canvasStore);

const worldBounds = computed(() => maxWorldContentBounds.value);

const minimapBounds = computed(() => {
  const containerWidth = containerSize.value.width;
  const containerHeight = containerSize.value.height;

  const width = containerWidth * sizeRatio;
  const height = containerHeight * sizeRatio;

  return {
    x: containerWidth - width - rightOffset,
    y: containerHeight - height - bottomOffset,

    width,
    height,
  };
});

const minimapTransform = computed(() => ({
  scale: {
    x: minimapBounds.value.width / worldBounds.value.width,
    y: minimapBounds.value.height / worldBounds.value.height,
  },
  translate: {
    x: worldBounds.value.left,
    y: worldBounds.value.top,
  },
}));

const camera = computed(() => {
  const viewWidth = containerSize.value.width / zoomFactor.value;
  const viewHeight = containerSize.value.height / zoomFactor.value;
  const cameraWorldX = -canvasOffset.value.x / zoomFactor.value;
  const cameraWorldY = -canvasOffset.value.y / zoomFactor.value;

  const rectWidth = viewWidth * minimapTransform.value.scale.x;
  const rectHeight = viewHeight * minimapTransform.value.scale.y;

  const offsetX =
    (cameraWorldX - minimapTransform.value.translate.x) *
    minimapTransform.value.scale.x;
  const offsetY =
    (cameraWorldY - minimapTransform.value.translate.y) *
    minimapTransform.value.scale.y;

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
      ((pointermove.clientX - lastPan.x) / minimapTransform.value.scale.x) *
      zoomFactor.value;
    const deltaY =
      ((pointermove.clientY - lastPan.y) / minimapTransform.value.scale.y) *
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
          graphics.stroke({ width: 1, color: $colors.Black });
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
          graphics.stroke({ width: 1, color: $colors.Cornflower });
          graphics.fill({ alpha: 0 });
        }
      "
    />
    <MiniPreview :minimap-transform="minimapTransform" />
  </Container>
</template>
