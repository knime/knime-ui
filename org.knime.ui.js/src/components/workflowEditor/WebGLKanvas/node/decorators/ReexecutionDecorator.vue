<script setup lang="ts">
import { computed } from "vue";
import { Container, Graphics } from "pixi.js";

import * as $colors from "@/style/colors";

/**
 * A decorator component which displays arrows if a node can trigger workflow re-execution.
 * For use on a node component of type 'Widget'.
 */

type Props = {
  /**
   * Node type for determining the background color.
   * */
  backgroundType: keyof typeof $colors.nodeBackgroundColors;
};
const props = defineProps<Props>();

const backgroundColor = computed(() => {
  return $colors.nodeBackgroundColors[props.backgroundType];
});

/* eslint-disable no-magic-numbers */
// Colored Background. This makes sure the lock is well visible even if it overlaps with the node icon
const renderBackground = (graphics: Graphics) => {
  graphics.roundRect(0, 5, 6, 6, 1);
  graphics.fill(backgroundColor.value);
};

const renderArrows = (graphics: Graphics) => {
  graphics
    .moveTo(7.5, 3)
    .lineTo(9.5, 3)
    .lineTo(9.5, 8)
    .lineTo(6.5, 8)
    .moveTo(4, 8)
    .lineTo(2, 8)
    .lineTo(2, 3)
    .lineTo(5, 3)
    .moveTo(4, 1.5)
    .lineTo(5.5, 3)
    .lineTo(4, 4.5)
    .moveTo(7.5, 9.5)
    .lineTo(6, 8)
    .lineTo(7.5, 6.5)
    .stroke({
      width: 1,
      color: $colors.Black,
      join: "round",
      cap: "round",
    });
};
/* eslint-enable no-magic-numbers */
</script>

<template>
  <Container>
    <Graphics v-if="backgroundColor" @effect="renderBackground" />
    <Graphics @effect="renderArrows" />
  </Container>
</template>
