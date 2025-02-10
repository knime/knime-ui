<script setup lang="ts">
import { storeToRefs } from "pinia";
import { type GraphicsInst, useStage } from "vue3-pixi";

import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";

const stage = useStage();

const { visibleArea } = storeToRefs(useWebGLCanvasStore());

const bounds = stage.value.getChildByName("contentBounds")?.getBounds();
</script>

<template>
  <Container>
    <Graphics
      v-if="visibleArea"
      :position="{ x: visibleArea.x, y: visibleArea.y }"
      @render="
        (graphics: GraphicsInst) => {
          graphics.clear();
          graphics.beginFill(0xf2eecb);
          graphics.drawRect(0, 0, visibleArea.width, visibleArea.height);
          graphics.endFill();
        }
      "
    />

    <Graphics
      v-if="bounds"
      :position="{ x: bounds.x, y: bounds.y }"
      @render="
        (graphics: GraphicsInst) => {
          if (bounds) {
            graphics.clear();
            graphics.beginFill(0x1099bb);
            graphics.drawRect(0, 0, bounds.width, bounds.height);
            graphics.endFill();
          }
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
          graphics.beginFill(0x000000);
          graphics.drawRect(0, 0, 10, 10);
          graphics.endFill();
        }
      "
    />
  </Container>
</template>
