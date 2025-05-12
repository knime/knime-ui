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
  graphics
    .moveTo(0, 2)
    .bezierCurveTo(0, 0.895431, 0.895431, 0, 2, 0, 1)
    .lineTo(8, 0)
    .lineTo(8, 2)
    .lineTo(2.75, 2)
    .bezierCurveTo(2.33579, 2, 2, 2.33579, 2, 2.75, 1)
    .lineTo(2, 8)
    .lineTo(0, 8)
    .lineTo(0, 2)
    .closePath();
  fill();

  // Bottom-left corner shape
  graphics
    .moveTo(2, 24)
    .lineTo(0, 24)
    .lineTo(0, 30)
    .bezierCurveTo(0, 31.1046, 0.895431, 32, 2, 32, 1)
    .lineTo(8, 32)
    .lineTo(8, 30)
    .lineTo(2.75, 30)
    .bezierCurveTo(2.33579, 30, 2, 29.6642, 2, 29.25, 1)
    .lineTo(2, 24)
    .closePath();
  fill();

  // Bottom-right corner shape
  graphics
    .moveTo(24, 30)
    .lineTo(24, 32)
    .lineTo(30, 32)
    .bezierCurveTo(31.104, 32, 32, 31.1046, 32, 30, 1)
    .lineTo(32, 24)
    .lineTo(30, 24)
    .lineTo(30, 29.25)
    .bezierCurveTo(30, 29.6642, 29.6642, 30, 29.25, 30, 1)
    .lineTo(24, 30)
    .closePath();
  fill();

  // Top-right corner shape
  graphics
    .moveTo(30, 8)
    .lineTo(32, 8)
    .lineTo(32, 2)
    .bezierCurveTo(32, 0.895431, 31.1046, 0, 30, 0, 1)
    .lineTo(24, 0)
    .lineTo(24, 2)
    .lineTo(29.25, 2)
    .bezierCurveTo(29.6642, 2, 30, 2.33579, 30, 2.75, 1)
    .lineTo(30, 8)
    .closePath();
  fill();

  // Small rectangles (Top, Bottom, Left, Right)
  graphics
    .rect(13, 0, 6, 2)
    .rect(13, 30, 6, 2)
    .rect(0, 13, 2, 6)
    .rect(30, 13, 2, 6);
  fill();
};

const renderExecutingArrows = (graphics: GraphicsInst) => {
  graphics
    .clear()
    .poly([
      { x: 11, y: 11 },
      { x: 11, y: 21 },
      { x: 14.75, y: 18.5 },
      { x: 14.75, y: 21 },
      { x: 22.25, y: 16 },
      { x: 14.75, y: 11 },
      { x: 14.75, y: 13.5 },
    ])
    .stroke({ width: 2, color: $colors.metanodeState });
};

const renderCheckmark = (graphics: GraphicsInst) => {
  graphics
    .clear()
    .moveTo(8, 16)
    .lineTo(14, 21.5)
    .lineTo(24, 10.5)
    .stroke({ width: 2, color: $colors.metanodeState });
};
</script>

<template>
  <Container event-mode="none">
    <Graphics
      event-mode="none"
      @render="
        (graphics: GraphicsInst) => {
          graphics
            .clear()
            .roundRect(0, 0, $shapes.nodeSize, $shapes.nodeSize, 2)
            .fill($colors.nodeBackgroundColors.Metanode);
        }
      "
    />
    <Graphics event-mode="none" @render="renderBorder" />

    <Graphics
      v-if="executionState === 'EXECUTING'"
      @render="renderExecutingArrows"
    />
    <Graphics
      v-else-if="executionState === 'EXECUTED'"
      @render="renderCheckmark"
    />
  </Container>
</template>
