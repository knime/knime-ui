<script setup lang="ts">
import { computed } from "vue";
import { Container, Graphics } from "pixi.js";

import { DashLine } from "@/lib/pixi-dash-line";
import * as $colors from "@/style/colors";
import type { GraphicsInst } from "@/vue3-pixi";

/**
 * An arrow icon that is used to indicate a linked component / metanode.
 * For use inside the Node component.
 */

type Props = {
  /**
   * Node type for determining the background color.
   * */
  backgroundType: keyof typeof $colors.nodeBackgroundColors;

  /**
   * The update status of the link of a component (UpToDate, HasUpdate, Error)
   */
  updateStatus: string;
};

const props = defineProps<Props>();

const backgroundColor = computed(() => {
  return $colors.nodeBackgroundColors[props.backgroundType];
});

/* eslint-disable no-magic-numbers */
// Colored Background. This makes sure the arrow is well visible even if it overlaps with the node icon
const renderBackground = (graphics: GraphicsInst) => {
  graphics.roundRect(5, 0, 6, 6, 1);
  graphics.fill(backgroundColor.value);
};

const drawArrow = (graphics: GraphicsInst | DashLine) => {
  graphics
    .moveTo(2.43, 8.57)
    .lineTo(9.5, 1.5)
    .moveTo(5, 1.5)
    .lineTo(9.5, 1.5)
    .lineTo(9.5, 6);
};

const renderArrow = (graphics: GraphicsInst) => {
  drawArrow(graphics);
  graphics.stroke({
    width: 1,
    color: $colors.linkDecoratorUpToDate,
    join: "round",
  });
};

const renderDottedArrow = (graphics: GraphicsInst) => {
  const dash = new DashLine(graphics, { dash: [1, 1] });
  drawArrow(dash);
  graphics.stroke({
    width: 1,
    color: $colors.linkDecorator,
    join: "round",
  });
};

const renderCross = (graphics: GraphicsInst) => {
  graphics
    .moveTo(2.43, 8.57)
    .lineTo(9.5, 1.5)
    .moveTo(9.5, 8.57)
    .lineTo(2.43, 1.5)
    .stroke({
      width: 1,
      color: $colors.linkDecoratorError,
      join: "round",
    });
};
/* eslint-enable no-magic-numbers */
</script>

<template>
  <Container label="LinkDecorator">
    <Graphics
      v-if="backgroundColor"
      label="LinkDecoratorBackground"
      @render="renderBackground"
    />

    <Graphics
      v-if="!updateStatus || updateStatus === 'UP_TO_DATE'"
      label="LinkDecoratorIcon"
      @render="renderArrow"
    />
    <Graphics
      v-else-if="updateStatus === 'HAS_UPDATE'"
      label="LinkDecoratorIcon"
      @render="renderDottedArrow"
    />
    <Graphics
      v-else-if="updateStatus === 'ERROR'"
      label="LinkDecoratorIcon"
      @render="renderCross"
    />
  </Container>
</template>
