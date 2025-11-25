<script setup lang="ts">
import { Graphics } from "pixi.js";

import { portColors } from "@/style/colors";
import { portSize } from "@/style/shapes";
import { type GraphicsInst } from "@/vue3-pixi";

const createOutlinePoints = (width: number) => {
  const offset = width / 2;

  // diagonal 1
  const d1 = [
    { x: -portSize / 2 - offset, y: -portSize / 2 + offset },
    { x: -portSize / 2 + offset, y: -portSize / 2 - offset },
    { x: portSize / 2 + offset, y: portSize / 2 - offset },
    { x: portSize / 2 - offset, y: portSize / 2 + offset },
  ];

  // diagonal 2
  const d2 = [
    { x: portSize / 2 - offset, y: -portSize / 2 - offset },
    { x: portSize / 2 + offset, y: -portSize / 2 + offset },
    { x: -portSize / 2 + offset, y: portSize / 2 + offset },
    { x: -portSize / 2 - offset, y: portSize / 2 - offset },
  ];

  // cross mid points
  const middles = [
    { x: -width, y: 0 },
    { x: 0, y: -width },
    { x: width, y: 0 },
    { x: 0, y: width },
  ];

  // ordered points to trace X outline
  return [
    middles[0],
    d1[0],
    d1[1],
    middles[1],
    d2[0],
    d2[1],
    middles[2],
    d1[2],
    d1[3],
    middles[3],
    d2[2],
    d2[3],
  ];
};

const renderOutlineX = (graphics: GraphicsInst) => {
  // outline
  const points = createOutlinePoints(2);
  graphics.poly(points).fill({ color: portColors.inactiveOutline });

  // X
  graphics
    .moveTo(-portSize / 2, -portSize / 2)
    .lineTo(portSize / 2, portSize / 2)
    .moveTo(-portSize / 2, portSize / 2)
    .lineTo(portSize / 2, -portSize / 2)
    .stroke({
      width: 1.5,
      color: portColors.inactive,
    });
};
</script>

<template>
  <Graphics label="PortInactiveDecorator" @render="renderOutlineX" />
</template>
