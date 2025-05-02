<script setup lang="ts">
import type { GraphicsInst } from "@/vue3-pixi";

type Props = {
  error?: string;
  warning?: string;
};

defineProps<Props>();
</script>

<template>
  <Container
    v-if="error || warning"
    :x="$shapes.nodeSize / 2"
    :y="$shapes.nodeStatusHeight"
  >
    <template v-if="error">
      <Graphics
        @render="
          (graphics: GraphicsInst) => {
            graphics.clear();
            graphics.circle(0, 0, 5);
            graphics.fill($colors.error);
          }
        "
      />
      <Graphics
        @render="
          (graphics: GraphicsInst) => {
            graphics.clear();
            graphics.moveTo(-2.25, -2.25);
            graphics.lineTo(2.25, 2.25);
            graphics.stroke({ width: 1, color: 'white' });
          }
        "
      />
      <Graphics
        @render="
          (graphics: GraphicsInst) => {
            graphics.clear();
            graphics.moveTo(2.25, -2.25);
            graphics.lineTo(-2.25, 2.25);
            graphics.stroke({ width: 1, color: 'white' });
          }
        "
      />
    </template>

    <Container v-else-if="warning" :position="{ x: -6, y: -6.5 }">
      <Graphics
        @render="
          (graphics: GraphicsInst) => {
            graphics.moveTo(6, 1.25);
            graphics.lineTo(0.5, 10.25);
            graphics.lineTo(11.5, 10.25);
            graphics.closePath();
            graphics.stroke({
              width: 2,
              color: $colors.Masala,
              alignment: 0.5,
              join: 'round',
            });
            graphics.fill($colors.warning);
          }
        "
      />
      <Graphics
        @render="
          (graphics: GraphicsInst) => {
            graphics.clear();
            graphics.moveTo(6, 4.2);
            graphics.lineTo(6, 7.3);
            graphics.stroke({ width: 1, color: $colors.Masala });
          }
        "
      />
      <Graphics
        @render="
          (graphics: GraphicsInst) => {
            graphics.clear();
            graphics.circle(6, 8.75, 0.5);
            graphics.fill($colors.Masala);
          }
        "
      />
    </Container>
  </Container>
</template>
