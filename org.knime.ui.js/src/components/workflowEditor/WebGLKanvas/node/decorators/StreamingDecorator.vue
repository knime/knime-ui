<script setup lang="ts">
import { computed } from "vue";
import { Container, Graphics, type StrokeInput } from "pixi.js";

import * as $colors from "@/style/colors";
import type { GraphicsInst } from "@/vue3-pixi";

/**
 * An arrow that indicates that the node is in streaming execution,
 * or an "x" to indicate that a non-streamable node is contained in a streaming context.
 * For use inside the Node component.
 */

type Props = {
  /**
   * Node type for determining the background color.
   * */
  backgroundType: keyof typeof $colors.nodeBackgroundColors;

  /**
   * executionInfo as sent by the backend.
   * For streaming components, this contains { jobManager: { type: 'streaming' }}.
   * For nodes contained in a streaming component, it contains { streamable: <Boolean> }
   * */
  executionInfo: {
    streamable?: boolean;
    jobManager?: {
      type: string;
    };
  };
};
const props = defineProps<Props>();

const backgroundColor = computed(() => {
  return $colors.nodeBackgroundColors[props.backgroundType];
});

const streamable = computed(() => {
  let { streamable, jobManager } = props.executionInfo;
  return streamable || jobManager?.type === "streaming";
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

const renderArrow = (graphics: GraphicsInst) => {
  graphics
    .moveTo(0.5, 5.5)
    .lineTo(1.5, 5.5)
    .moveTo(3.5, 5.5)
    .lineTo(4.5, 5.5)
    .moveTo(6.5, 5.5)
    .lineTo(7.7, 5.5)
    .moveTo(5.80957, 2.40625)
    .lineTo(8.90332, 5.5)
    .lineTo(5.80957, 8.59375)
    .stroke(strokeStyle);
};

const renderX = (graphics: GraphicsInst) => {
  graphics
    .moveTo(2.40625, 8.59375)
    .lineTo(8.59375, 2.40625)
    .moveTo(2.40625, 2.40625)
    .lineTo(8.59375, 8.59375)
    .stroke(strokeStyle);
};
/* eslint-enable no-magic-numbers */
</script>

<template>
  <Container>
    <Graphics v-if="streamable" @render="renderArrow" />
    <template v-else>
      <Graphics v-if="backgroundColor" @render="renderBackground" />
      <Graphics @render="renderX" />
    </template>
  </Container>
</template>
