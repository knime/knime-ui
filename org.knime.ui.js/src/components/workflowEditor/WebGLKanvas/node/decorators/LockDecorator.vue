<script setup lang="ts">
import { computed } from "vue";
import { Container, Graphics, type StrokeInput } from "pixi.js";

import * as $colors from "@/style/colors";
import type { GraphicsInst } from "@/vue3-pixi";

/**
 * A lock icon that is used to indicate an un-/locked component / metanode.
 * For use inside the Node component.
 */

type Props = {
  /**
   * Node type for determining the background color.
   * */
  backgroundType: keyof typeof $colors.nodeBackgroundColors;

  /**
   * Whether or not the node is locked or a locked node has been unlocked.
   */
  isLocked: boolean;
};
const props = defineProps<Props>();

const backgroundColor = computed(() => {
  return $colors.nodeBackgroundColors[props.backgroundType];
});

/* eslint-disable no-magic-numbers */
// Colored Background. This makes sure the lock is well visible even if it overlaps with the node icon
const renderBackground = (graphics: GraphicsInst) => {
  graphics.roundRect(0, 5, 6, 6, 1);
  graphics.fill(backgroundColor.value);
};

const strokeStyle: StrokeInput = {
  width: 1,
  color: $colors.Black,
  join: "round",
  cap: "round",
};

const renderLocked = (graphics: GraphicsInst) => {
  graphics
    .rect(1.5625, 3.99902, 5.87503, 4.12622)
    .moveTo(4.5, 6.89504)
    .lineTo(4.5, 5.71436)
    .moveTo(2.53125, 3.99892)
    .lineTo(2.53125, 2.84326)
    .bezierCurveTo(2.53125, 1.75651, 3.41297, 0.874512, 4.5, 0.874512, 1)
    .bezierCurveTo(5.58759, 0.874512, 6.46875, 1.75651, 6.46875, 2.84326, 1)
    .lineTo(6.46875, 3.99892)
    .moveTo(3.97705, 5.71436)
    .lineTo(5.0233, 5.71436)
    .stroke(strokeStyle);
};

const renderUnlocked = (graphics: GraphicsInst) => {
  graphics
    .rect(2.5625, 3.99902, 5.87503, 4.12622)
    .moveTo(5.5, 6.89504)
    .lineTo(5.5, 5.71436)
    .moveTo(0.53125, 3.99892)
    .lineTo(0.53125, 2.84326)
    .bezierCurveTo(0.53125, 1.75651, 1.41297, 0.874512, 2.5, 0.874512, 1)
    .bezierCurveTo(3.58759, 0.874512, 4.46875, 1.75651, 4.46875, 2.84326, 1)
    .lineTo(4.46875, 3.99892)
    .moveTo(4.97705, 5.71436)
    .lineTo(6.0233, 5.71436)
    .stroke(strokeStyle);
};
/* eslint-enable no-magic-numbers */
</script>

<template>
  <Container>
    <Graphics v-if="backgroundColor" @render="renderBackground" />
    <Graphics v-if="isLocked" @render="renderLocked" />
    <Graphics v-else @render="renderUnlocked" />
  </Container>
</template>
