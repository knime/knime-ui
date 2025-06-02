<script setup lang="ts">
import { DashLine } from "@/util/pixiDashedLine";

type Props = {
  selected: boolean;
};
defineProps<Props>();
</script>

<template>
  <Graphics
    v-if="selected"
    @render="
      (graphics) => {
        graphics.circle(0, 0, 9).stroke({ color: $colors.CornflowerDark });
        graphics.circle(0, 0, 8.5).fill({ color: $colors.White });
      }
    "
  />
  <Graphics
    @render="
      (graphics) => {
        graphics.clear();
        graphics.circle(0, 0, 6);
        graphics.fill(0xffffff);
      }
    "
  />
  <Graphics
    @render="
      (graphics) => {
        graphics.clear();
        const dash = new DashLine(graphics, { dash: [1, 1] });
        dash.circle(0, 0, 6);
        graphics.stroke({ width: 1, color: 0x000000 });
      }
    "
  />
  <Graphics
    @render="
      (graphics) => {
        graphics.clear();
        graphics.moveTo(-3.5, 0);
        graphics.lineTo(3.5, 0);
        graphics.stroke({ width: 1, color: 0x000000 });
      }
    "
  />
  <Graphics
    @render="
      (graphics) => {
        graphics.clear();
        graphics.moveTo(0, -3.5);
        graphics.lineTo(0, 3.5);
        graphics.stroke({ width: 1, color: 0x000000 });
      }
    "
  />
</template>
