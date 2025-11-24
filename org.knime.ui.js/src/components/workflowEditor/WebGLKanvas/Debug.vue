<script setup lang="ts">
import { storeToRefs } from "pinia";
import type { Graphics } from "pixi.js";

import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useWorkflowStore } from "@/store/workflow/workflow";

const { visibleArea, canvasLayers } = storeToRefs(useWebGLCanvasStore());

const { workflowBounds } = storeToRefs(useWorkflowStore());
</script>

<template>
  <Container :layer="canvasLayers.debugLayer">
    <Graphics
      v-if="visibleArea"
      :position="{ x: visibleArea.x, y: visibleArea.y }"
      @render="
        (graphics: Graphics) => {
          graphics.clear();
          graphics.rect(0, 0, visibleArea.width, visibleArea.height);
          graphics.fill(0xf2eecb);
        }
      "
    />

    <!-- BOUNDS -->
    <Graphics
      :x="workflowBounds.left"
      :y="workflowBounds.top"
      @render="
        (graphics: Graphics) => {
          graphics.clear();
          graphics.rect(0, 0, workflowBounds.width, workflowBounds.height);
          graphics.fill($colors.CornflowerLight);
        }
      "
    />

    <!-- ORIGIN -->
    <Graphics
      :x="0"
      :y="0"
      @render="
        (graphics: Graphics) => {
          graphics.clear();
          graphics.rect(0, 0, 10, 10);
          graphics.fill(0x000000);
        }
      "
    />
  </Container>
</template>
