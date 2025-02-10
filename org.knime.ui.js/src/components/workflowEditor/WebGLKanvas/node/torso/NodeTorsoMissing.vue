<!-- eslint-disable no-magic-numbers -->
<script setup lang="ts">
import type { GraphicsInst } from "vue3-pixi";

const renderFn = (graphics: GraphicsInst) => {
  // Define colors
  const backgroundColor = 0xffffff; // White fill for background
  const borderStrokeColor = 0xa90a42; // Border stroke color
  const mainPathColor = 0xd30d52; // Main path fill
  const innerCircleStroke = 0xd30d52; // Inner circle stroke
  const innerPathStroke = 0x3e3a39; // Path stroke inside the circle

  // Background rounded rectangle
  graphics.beginFill(backgroundColor);
  graphics.drawRoundedRect(0, 0, 32, 32, 2);
  graphics.endFill();

  // Main path shape
  graphics.beginFill(mainPathColor);
  graphics.moveTo(32, 5.3);
  graphics.lineTo(32, 4.3);
  graphics.lineTo(27.9, 4.3);
  graphics.lineTo(27.9, 0);
  graphics.lineTo(26.9, 0);
  graphics.lineTo(26.9, 4.3);
  graphics.lineTo(22.3, 4.3);
  graphics.lineTo(22.3, 0);
  graphics.lineTo(21.3, 0);
  graphics.lineTo(21.3, 4.3);
  graphics.lineTo(16.7, 4.3);
  graphics.lineTo(16.7, 0);
  graphics.lineTo(15.7, 0);
  graphics.lineTo(15.7, 4.3);
  graphics.lineTo(11.1, 4.3);
  graphics.lineTo(11.1, 0);
  graphics.lineTo(10.1, 0);
  graphics.lineTo(10.1, 4.3);
  graphics.lineTo(5.5, 4.3);
  graphics.lineTo(5.5, 0);
  graphics.lineTo(4.5, 0);
  graphics.lineTo(4.5, 4.3);
  graphics.lineTo(0, 4.3);
  graphics.lineTo(0, 5.3);
  graphics.lineTo(4.5, 5.3);
  graphics.lineTo(4.5, 9.9);
  graphics.lineTo(0, 9.9);
  graphics.lineTo(0, 10.9);
  graphics.lineTo(4.5, 10.9);
  graphics.lineTo(4.5, 15.5);
  graphics.lineTo(0, 15.5);
  graphics.lineTo(0, 16.5);
  graphics.lineTo(4.5, 16.5);
  graphics.lineTo(4.5, 21.1);
  graphics.lineTo(0, 21.1);
  graphics.lineTo(0, 22.1);
  graphics.lineTo(4.5, 22.1);
  graphics.lineTo(4.5, 26.7);
  graphics.lineTo(0, 26.7);
  graphics.lineTo(0, 27.7);
  graphics.lineTo(4.5, 27.7);
  graphics.lineTo(4.5, 32);
  graphics.lineTo(5.5, 32);
  graphics.lineTo(5.5, 27.7);
  graphics.lineTo(10.1, 27.7);
  graphics.lineTo(10.1, 32);
  graphics.lineTo(11.1, 32);
  graphics.lineTo(11.1, 27.7);
  graphics.lineTo(15.7, 27.7);
  graphics.lineTo(15.7, 32);
  graphics.lineTo(16.7, 32);
  graphics.lineTo(16.7, 27.7);
  graphics.lineTo(21.3, 27.7);
  graphics.lineTo(21.3, 32);
  graphics.lineTo(22.3, 32);
  graphics.lineTo(22.3, 27.7);
  graphics.lineTo(26.9, 27.7);
  graphics.lineTo(26.9, 32);
  graphics.lineTo(27.9, 32);
  graphics.lineTo(27.9, 27.7);
  graphics.lineTo(32, 27.7);
  graphics.lineTo(32, 26.7);
  graphics.lineTo(27.9, 26.7);
  graphics.lineTo(27.9, 22.1);
  graphics.lineTo(32, 22.1);
  graphics.lineTo(32, 21.1);
  graphics.lineTo(27.9, 21.1);
  graphics.lineTo(27.9, 16.5);
  graphics.lineTo(32, 16.5);
  graphics.lineTo(32, 15.5);
  graphics.lineTo(27.9, 15.5);
  graphics.lineTo(27.9, 10.9);
  graphics.lineTo(32, 10.9);
  graphics.lineTo(32, 9.9);
  graphics.lineTo(27.9, 9.9);
  graphics.lineTo(27.9, 5.3);
  graphics.closePath();
  graphics.endFill();

  // Outer white circle
  graphics.beginFill(backgroundColor);
  graphics.lineStyle(1, backgroundColor);
  graphics.drawCircle(16, 16, 8.5);
  graphics.endFill();

  // Inner circle with red stroke
  graphics.beginFill(backgroundColor);
  graphics.lineStyle(1, innerCircleStroke);
  graphics.drawCircle(16, 16, 7.5);
  graphics.endFill();

  // Inner stroke path
  graphics.lineStyle(1, innerPathStroke);
  graphics.moveTo(16, 18);
  graphics.quadraticCurveTo(15.8, 16.8, 17.2, 15.73);
  graphics.quadraticCurveTo(18, 15.26, 18, 14.07);
  graphics.quadraticCurveTo(18, 12.93, 16, 12);
  graphics.quadraticCurveTo(14.86, 12.86, 14, 14);
  graphics.endFill();

  // Small dot inside the circle
  graphics.beginFill(innerPathStroke);
  graphics.drawCircle(16, 19.8, 0.5);
  graphics.endFill();

  // Border outline
  graphics.lineStyle(1, borderStrokeColor);
  graphics.drawRoundedRect(0.5, 0.5, 31, 31, 1.5);
};
</script>

<template>
  <Graphics event-mode="none" @render="renderFn" />
</template>
