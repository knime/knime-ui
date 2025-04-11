<script setup lang="ts">
import { Container, Graphics, type StrokeInput } from "pixi.js";

import * as $colors from "@/style/colors";

/**
 * A decorator component which displays icons for loop execution state.
 * For use in a Node component.
 */

type Props = {
  /**
   *  Loop specific configuration options
   */
  loopStatus?: string | null;
};
defineProps<Props>();

const backgroundColor = $colors.nodeBackgroundColors.Loop;
const stroke: StrokeInput = { color: $colors.Masala, width: 1, join: "round" };

/* eslint-disable no-magic-numbers */
const renderBackground = (graphics: Graphics) => {
  graphics
    .moveTo(0.441293, 0.440316)
    .lineTo(1.50195, 0.000976562)
    .lineTo(6.99728, 0.000977039)
    .lineTo(6.99728, 3.00098)
    .lineTo(7.00418, 6.9963)
    .lineTo(0.00195312, 6.9963)
    .lineTo(0.00195338, 1.50098)
    .bezierCurveTo(
      0.00195338,
      1.10315,
      0.159989,
      0.721621,
      0.441293,
      0.440316,
      1,
    )
    .closePath()
    .fill(backgroundColor);
};

const renderPause = (graphics: Graphics) => {
  renderBackground(graphics);
  graphics
    .moveTo(5, 9.0625)
    .bezierCurveTo(7.24366, 9.0625, 9.0625, 7.24366, 9.0625, 5, 1)
    .bezierCurveTo(9.0625, 2.75634, 7.24366, 0.9375, 5, 0.9375, 1)
    .bezierCurveTo(2.75634, 0.9375, 0.9375, 2.75634, 0.9375, 5, 1)
    .bezierCurveTo(0.9375, 7.24366, 2.75634, 9.0625, 5, 9.0625, 1)
    .closePath()
    .stroke(stroke)
    .moveTo(4.04102, 3.104)
    .lineTo(4.04102, 6.89588)
    .moveTo(5.95898, 6.89588)
    .lineTo(5.95898, 3.104)
    .stroke(stroke);
};

const renderRunning = (graphics: Graphics) => {
  renderBackground(graphics);
  graphics
    .moveTo(6.28125, 6.96875)
    .lineTo(5.4375, 8.34375)
    .lineTo(6.84375, 9.21875)
    .moveTo(5.4375, 8.34375)
    .bezierCurveTo(7.1875, 8.125, 8.53125, 6.78125, 8.53125, 5, 1)
    .bezierCurveTo(8.53125, 3.40625, 7.46875, 2.0625, 6, 1.625, 1)
    .moveTo(3.75, 3.03125)
    .lineTo(4.5625, 1.65625)
    .lineTo(3.15625, 0.78125)
    .moveTo(4.5625, 1.65625)
    .bezierCurveTo(2.8125, 1.875, 1.46875, 3.21875, 1.46875, 5, 1)
    .bezierCurveTo(1.46875, 6.59375, 2.53125, 7.9375, 4, 8.375, 1)
    .stroke(stroke);
};
/* eslint-enable no-magic-numbers */
</script>

<template>
  <Container>
    <!-- Loop execution paused. -->
    <Graphics v-if="loopStatus === 'PAUSED'" @render="renderPause" />
    <!-- Loop execution running. -->
    <Graphics v-else-if="loopStatus === 'RUNNING'" @render="renderRunning" />
  </Container>
</template>
