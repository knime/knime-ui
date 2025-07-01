<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { clamp } from "@/util/clamp";

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

const camera = computed(() => {
  const viewWidth = containerSize.value.width / zoomFactor.value;
  const viewHeight = containerSize.value.height / zoomFactor.value;
  const cameraWorldX = -canvasOffset.value.x / zoomFactor.value;
  const cameraWorldY = -canvasOffset.value.y / zoomFactor.value;

  const scaleX = minimapBounds.value.width / worldBounds.value.width;
  const scaleY = minimapBounds.value.height / worldBounds.value.height;

  const rectWidth = viewWidth * scaleX;
  const rectHeight = viewHeight * scaleY;

  const offsetX = (cameraWorldX - worldBounds.value.left) * scaleX;
  const offsetY = (cameraWorldY - worldBounds.value.top) * scaleY;

  const miniCameraRect = {
    x: clamp(offsetX, 0, minimapBounds.value.width - rectWidth),
    y: clamp(offsetY, 0, minimapBounds.value.height - rectHeight),
    width: rectWidth,
    height: rectHeight,
  };

  return miniCameraRect;
});

// onMounted(() => {
//   console.log("containerSize.value :>> ", containerSize.value);
//   console.log("minimapBounds.value :>> ", minimapBounds.value);
//   console.log("workflowBounds.value :>> ", workflowBounds.value);
//   console.log("paddedBounds.value :>> ", paddedBounds.value);
//   console.log("canvasSize.value :>> ", canvasSize.value);
// });
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
      @render="
        (graphics) => {
          graphics.clear();
          graphics.rect(camera.x, camera.y, camera.width, camera.height);
          graphics.stroke({ width: 1, color: 'blue' });
        }
      "
    />
  </Container>
</template>
