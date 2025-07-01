<script setup lang="ts">
import { storeToRefs } from "pinia";

import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { type GraphicsInst } from "@/vue3-pixi";

const { visibleArea, maxWorldContentBounds } = storeToRefs(
  useWebGLCanvasStore(),
);

const { workflowBounds } = storeToRefs(useWorkflowStore());
</script>

<template>
  <Container>
    <Graphics
      v-if="visibleArea"
      :position="{ x: visibleArea.x, y: visibleArea.y }"
      @render="
        (graphics: GraphicsInst) => {
          graphics.clear();
          graphics.rect(0, 0, visibleArea.width, visibleArea.height);
          graphics.fill(0xf2eecb);
        }
      "
    />

    <Graphics
      :x="maxWorldContentBounds.left"
      :y="maxWorldContentBounds.top"
      @render="
        (graphics: GraphicsInst) => {
          graphics.clear();
          graphics.rect(
            0,
            0,
            maxWorldContentBounds.width,
            maxWorldContentBounds.height,
          );
          graphics.fill($colors.AvocadoDark);
        }
      "
    />

    <!-- BOUNDS -->
    <Graphics
      :x="workflowBounds.left"
      :y="workflowBounds.top"
      @render="
        (graphics: GraphicsInst) => {
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
        (graphics: GraphicsInst) => {
          graphics.clear();
          graphics.rect(0, 0, 10, 10);
          graphics.fill(0x000000);
        }
      "
    />
  </Container>
</template>
