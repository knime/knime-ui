<!-- eslint-disable func-style -->
<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
import { storeToRefs } from "pinia";
import { type FederatedPointerEvent, type Graphics } from "pixi.js";
import { Rectangle } from "pixi.js";

import { clamp } from "@/lib/math";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";

import MiniPreview from "./MiniPreview.vue";

type Props = {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
};

const { canvas, width, height } = defineProps<Props>();

const canvasStore = useWebGLCanvasStore();

const { containerSize, canvasOffset, zoomFactor, maxWorldContentBounds } =
  storeToRefs(canvasStore);

const worldBounds = computed(() => maxWorldContentBounds.value);

const minimapBounds = computed(() => {
  return {
    x: 0,
    y: 0,
    width,
    height,
  };
});

const minimapTransform = computed(() => ({
  scale: {
    x: minimapBounds.value.width / worldBounds.value.width,
    y: minimapBounds.value.height / worldBounds.value.height,
  },
  translate: { x: worldBounds.value.left, y: worldBounds.value.top },
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

const cameraRef = useTemplateRef<Graphics>("cameraRef");
const minimapRef = useTemplateRef<Graphics>("minimapRef");

const minimapDeltaToCanvasDelta = (value: number, isXAxis = true) => {
  const scale = isXAxis
    ? minimapTransform.value.scale.x
    : minimapTransform.value.scale.y;

  return (value / scale) * zoomFactor.value * -1;
};

const onCameraPointerdown = (pointerdown: FederatedPointerEvent) => {
  const isOutOfBounds = (move: PointerEvent) => {
    return (
      move.offsetX < minimapBounds.value.x ||
      move.offsetX > minimapBounds.value.x + minimapBounds.value.width ||
      move.offsetY < minimapBounds.value.y ||
      move.offsetY > minimapBounds.value.y + minimapBounds.value.height
    );
  };

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
      return;
    }

    const deltaX = minimapDeltaToCanvasDelta(pointermove.clientX - lastPan.x);
    const deltaY = minimapDeltaToCanvasDelta(
      pointermove.clientY - lastPan.y,
      false,
    );

    canvasStore.setCanvasOffset({
      x: canvasOffset.value.x + deltaX,
      y: canvasOffset.value.y + deltaY,
    });

    lastPan.x = pointermove.clientX;
    lastPan.y = pointermove.clientY;
  }

  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", teardown);
};

const onMinimapPointerdown = (pointerdown: FederatedPointerEvent) => {
  const localPosition = pointerdown.getLocalPosition(minimapRef.value!);

  const cameraCenterX = camera.value.x + camera.value.width / 2;
  const cameraCenterY = camera.value.y + camera.value.height / 2;
  const deltaX = minimapDeltaToCanvasDelta(localPosition.x - cameraCenterX);
  const deltaY = minimapDeltaToCanvasDelta(
    localPosition.y - cameraCenterY,
    false,
  );

  canvasStore.setCanvasOffset({
    x: canvasOffset.value.x + deltaX,
    y: canvasOffset.value.y + deltaY,
  });

  // continue interaction into a camera pan
  onCameraPointerdown(pointerdown);
};
</script>

<template>
  <Container
    ref="minimapRef"
    label="Minimap"
    event-mode="static"
    :position="minimapBounds"
    :hit-area="new Rectangle(0, 0, width, height)"
    @pointerdown.stop="onMinimapPointerdown"
    @pointerenter.stop
    @pointerleave.stop
  >
    <MiniPreview :minimap-transform="minimapTransform" />

    <Graphics
      ref="cameraRef"
      label="MinimapCamera"
      event-mode="static"
      @pointerdown.stop="onCameraPointerdown"
      @render="
        (graphics) => {
          graphics
            .clear()
            .rect(camera.x, camera.y, camera.width, camera.height)
            .stroke({ width: 1, color: $colors.Cornflower })
            .fill({ alpha: 0 });
        }
      "
    />
  </Container>
</template>
