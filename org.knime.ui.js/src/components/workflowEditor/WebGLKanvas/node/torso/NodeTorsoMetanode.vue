<!-- eslint-disable no-magic-numbers -->
<script setup lang="ts">
import type { MetaNodeState } from "@/api/gateway-api/generated-api";
import * as $colors from "@/style/colors";
import type { GraphicsInst } from "@/vue3-pixi";

type Props = {
  executionState?: MetaNodeState.ExecutionStateEnum;
};

defineProps<Props>();

const renderBorder = (graphics: GraphicsInst) => {
  const fill = () =>
    graphics.fill($colors.nodeBackgroundColors.MetanodeSecondary);

  // Top-left corner shape
  graphics.moveTo(0, 2);
  graphics.quadraticCurveTo(0, 0, 2, 0);
  graphics.lineTo(8, 0);
  graphics.lineTo(8, 2);
  graphics.lineTo(2.75, 2);
  graphics.quadraticCurveTo(2, 2, 2, 2.75);
  graphics.lineTo(2, 8);
  graphics.lineTo(0, 8);
  graphics.lineTo(0, 2);
  graphics.closePath();
  fill();

  // Bottom-left corner shape
  graphics.moveTo(2, 24);
  graphics.lineTo(0, 24);
  graphics.lineTo(0, 30);
  graphics.quadraticCurveTo(0, 32, 2, 32);
  graphics.lineTo(8, 32);
  graphics.lineTo(8, 30);
  graphics.lineTo(2.75, 30);
  graphics.quadraticCurveTo(2, 30, 2, 29.25);
  graphics.lineTo(2, 24);
  graphics.closePath();
  fill();

  // Bottom-right corner shape
  graphics.moveTo(24, 30);
  graphics.lineTo(24, 32);
  graphics.lineTo(30, 32);
  graphics.quadraticCurveTo(32, 32, 32, 30);
  graphics.lineTo(32, 24);
  graphics.lineTo(30, 24);
  graphics.lineTo(30, 29.25);
  graphics.quadraticCurveTo(30, 30, 29.25, 30);
  graphics.lineTo(24, 30);
  graphics.closePath();
  fill();

  // Top-right corner shape
  graphics.moveTo(30, 8);
  graphics.lineTo(32, 8);
  graphics.lineTo(32, 2);
  graphics.quadraticCurveTo(32, 0, 30, 0);
  graphics.lineTo(24, 0);
  graphics.lineTo(24, 2);
  graphics.lineTo(29.25, 2);
  graphics.quadraticCurveTo(30, 2, 30, 2.75);
  graphics.lineTo(30, 8);
  graphics.closePath();
  fill();

  // Small rectangles (Top, Bottom, Left, Right)
  graphics.rect(13, 0, 6, 2);
  graphics.rect(13, 30, 6, 2);
  graphics.rect(0, 13, 2, 6);
  graphics.rect(30, 13, 2, 6);
  fill();
};
</script>

<template>
  <Container event-mode="none">
    <Graphics
      event-mode="none"
      @render="
        (graphics: GraphicsInst) => {
          graphics.clear();
          graphics.roundRect(0, 0, $shapes.nodeSize, $shapes.nodeSize, 2);
          graphics.fill($colors.nodeBackgroundColors.Metanode);
        }
      "
    />
    <Graphics event-mode="none" @render="renderBorder" />

    <Graphics
      v-if="executionState === 'EXECUTING'"
      event-mode="none"
      @render="
        (graphics: GraphicsInst) => {
          graphics.clear();
          graphics.poly([
            { x: 11, y: 11 },
            { x: 11, y: 21 },
            { x: 14.75, y: 18.5 },
            { x: 14.75, y: 21 },
            { x: 22.25, y: 16 },
            { x: 14.75, y: 11 },
            { x: 14.75, y: 13.5 },
          ]);
          graphics.stroke({ width: 2, color: $colors.metanodeState });
        }
      "
    />
  </Container>
</template>
