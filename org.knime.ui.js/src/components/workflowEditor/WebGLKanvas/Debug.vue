<script setup lang="ts">
import { storeToRefs } from "pinia";

import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { type GraphicsInst } from "@/vue3-pixi";

const { visibleArea } = storeToRefs(useWebGLCanvasStore());
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
