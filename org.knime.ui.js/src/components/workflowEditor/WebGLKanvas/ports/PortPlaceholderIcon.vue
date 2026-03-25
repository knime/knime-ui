<script setup lang="ts">
import { DashLine } from "@/lib/pixi-dash-line";
import { webGlPortSize } from "@/style/shapes";

type Props = {
  selected: boolean;
};
defineProps<Props>();

const selectionOuterRadius = webGlPortSize / 2 + 4;
const selectionInnerRadius = selectionOuterRadius - 0.5;
const placeholderRadius = webGlPortSize / 2 + 2;
const plusHalfSize = webGlPortSize / 2 - 0.5;
</script>

<template>
  <Graphics
    v-if="selected"
    label="PortPlaceholderIconSelectionRing"
    @render="
      (graphics) => {
        graphics
          .circle(0, 0, selectionOuterRadius)
          .stroke({ color: $colors.CornflowerDark });
        graphics.circle(0, 0, selectionInnerRadius).fill({ color: $colors.White });
      }
    "
  />
  <Graphics
    label="PortPlaceholderIcon"
    @render="
      (graphics) => {
        graphics.clear();

        // background
        graphics.circle(0, 0, placeholderRadius);
        graphics.fill(0xffffff);

        // dashed border
        const dash = new DashLine(graphics, { dash: [1, 1] });
        dash.circle(0, 0, placeholderRadius);
        graphics.stroke({ width: 1, color: 0x000000 });

        // icon
        graphics.moveTo(-plusHalfSize, 0);
        graphics.lineTo(plusHalfSize, 0);
        graphics.stroke({ width: 1, color: 0x000000 });
        graphics.moveTo(0, -plusHalfSize);
        graphics.lineTo(0, plusHalfSize);
        graphics.stroke({ width: 1, color: 0x000000 });
      }
    "
  />
</template>
