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
    event-mode="none"
    :x="$shapes.nodeSize / 2"
    :y="$shapes.nodeStatusHeight"
  >
    <template v-if="error">
      <Graphics
        event-mode="none"
        @render="
          (graphics: GraphicsInst) => {
            graphics.clear();
            graphics.beginFill($colors.error);
            graphics.drawCircle(0, 0, 5);
            graphics.endFill();
          }
        "
      />
      <Graphics
        event-mode="none"
        @render="
          (graphics: GraphicsInst) => {
            graphics.clear();
            graphics.lineStyle(1, 0xffffff);
            graphics.moveTo(-2.25, -2.25);
            graphics.lineTo(2.25, 2.25);
            graphics.endFill();
          }
        "
      />
      <Graphics
        event-mode="none"
        @render="
          (graphics: GraphicsInst) => {
            graphics.clear();
            graphics.lineStyle(1, 0xffffff);
            graphics.moveTo(2.25, -2.25);
            graphics.lineTo(-2.25, 2.25);
            graphics.endFill();
          }
        "
      />
    </template>

    <Container
      v-else-if="warning"
      event-mode="none"
      :position="{ x: -6, y: -5.5 }"
    >
      <Graphics
        event-mode="none"
        @render="
          (graphics: GraphicsInst) => {
            graphics.lineStyle({
              width: 1,
              color: $colors.Masala,
              alignment: 0.5,
              join: 'round',
            });
            graphics.beginFill($colors.warning);
            graphics.moveTo(6, 1.25);
            graphics.lineTo(0.5, 10.75);
            graphics.lineTo(11.5, 10.75);
            graphics.closePath();
            graphics.endFill();
          }
        "
      />
      <Graphics
        event-mode="none"
        @render="
          (graphics: GraphicsInst) => {
            graphics.clear();
            graphics.lineStyle(1, $colors.Masala);
            graphics.moveTo(6, 4.2);
            graphics.lineTo(6, 7.3);
            graphics.endFill();
          }
        "
      />
      <Graphics
        event-mode="none"
        @render="
          (graphics: GraphicsInst) => {
            graphics.clear();
            graphics.beginFill($colors.Masala);
            graphics.drawCircle(6, 8.75, 0.5);
            graphics.endFill();
          }
        "
      />
    </Container>
  </Container>
</template>
