<!-- eslint-disable no-magic-numbers -->
<script setup lang="ts">
import type { GraphicsInst } from "@/vue3-pixi";

import type { MetaNodeState } from "@/api/gateway-api/generated-api";
import * as $colors from "@/style/colors";

type Props = {
  executionState?: MetaNodeState.ExecutionStateEnum;
};

defineProps<Props>();

const renderBorder = (graphics: GraphicsInst) => {
  graphics.beginFill($colors.nodeBackgroundColors.MetanodeSecondary);

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

  // Small rectangles (Top, Bottom, Left, Right)
  graphics.drawRect(13, 0, 6, 2);
  graphics.drawRect(13, 30, 6, 2);
  graphics.drawRect(0, 13, 2, 6);
  graphics.drawRect(30, 13, 2, 6);

  graphics.endFill();
};
</script>

<template>
  <Container event-mode="none">
    <Graphics
      event-mode="none"
      @render="
        (graphics: GraphicsInst) => {
          graphics.clear();
          graphics.beginFill($colors.nodeBackgroundColors.Metanode);
          graphics.drawRoundedRect(0, 0, $shapes.nodeSize, $shapes.nodeSize, 2);
          graphics.endFill();
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
          graphics.lineStyle(2, $colors.metanodeState);
          graphics.drawPolygon([
            { x: 11, y: 11 },
            { x: 11, y: 21 },
            { x: 14.75, y: 18.5 },
            { x: 14.75, y: 21 },
            { x: 22.25, y: 16 },
            { x: 14.75, y: 11 },
            { x: 14.75, y: 13.5 },
          ]);
        }
      "
    />
  </Container>
</template>
