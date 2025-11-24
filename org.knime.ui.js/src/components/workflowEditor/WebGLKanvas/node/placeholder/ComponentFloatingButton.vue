<script setup lang="ts">
import { ref } from "vue";
import { storeToRefs } from "pinia";
import { GraphicsContext, Rectangle } from "pixi.js";
import type { Graphics } from "pixi.js";

import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";

type Props = {
  x?: number;
  icon: GraphicsContext;
};

withDefaults(defineProps<Props>(), {
  x: 0,
});

const canvasStore = useWebGLCanvasStore();
const { isDebugModeEnabled: isCanvasDebugEnabled } = storeToRefs(canvasStore);

const isHovered = ref(false);
// eslint-disable-next-line no-magic-numbers
const hitArea = new Rectangle(-12.5, -10, 25, 20);
</script>

<template>
  <Container
    :position="{ x, y: 0 }"
    event-mode="static"
    :hit-area="hitArea"
    cursor="pointer"
    @pointerenter="isHovered = true"
    @pointerleave="isHovered = false"
  >
    <Graphics
      v-if="isCanvasDebugEnabled"
      :x="hitArea.x"
      :y="hitArea.y"
      @render="
        (graphics: Graphics) => {
          graphics.clear();
          graphics.rect(0, 0, hitArea.width, hitArea.height);
          graphics.stroke({ width: 1, color: $colors.Black });
        }
      "
    />

    <Graphics
      @render="
        (graphics) => {
          graphics.clear();
          graphics.circle(0, 0, 9.5);
          graphics.stroke({
            width: 1,
            color: isHovered ? $colors.Masala : $colors.SilverSand,
          });
          graphics.fill(isHovered ? $colors.Masala : $colors.White);
        }
      "
    />

    <Graphics
      :width="10"
      :height="10"
      :x="-5"
      :y="-5"
      :geometry="icon"
      @render="
        (graphics) => {
          graphics.tint = isHovered ? $colors.White : $colors.Masala;
        }
      "
    />
  </Container>
</template>
