<script setup lang="ts">
import { computed } from "vue";
import type { Container } from "pixi.js";
import type { GraphicsInst } from "vue3-pixi";

import type { NodeState } from "@/api/gateway-api/generated-api";
import * as $shapes from "@/style/shapes";
import { nodeStateText } from "../../util/textStyles";

import { useNodeStateExecutingAnimation } from "./useNodeStateExecutingAnimation";

type Props = {
  progress?: number;
  executionState?: NodeState.ExecutionStateEnum;
};

const props = defineProps<Props>();

const clippedProgress = computed(() =>
  Math.min(Math.max(props.progress!, 0), 1),
);

const progressBarWidth = computed(() => {
  let result = $shapes.nodeSize * clippedProgress.value;
  if (result && result < 1) {
    // fractional pixels just don't look good
    return 1;
  }
  return result;
});

const progressDisplayPercentage = computed(() => {
  // Use `floor` instead of `round` so that 100% isn't reached too early
  return Math.floor(100 * clippedProgress.value);
});

const { containerRef: animatedCircleRef } = useNodeStateExecutingAnimation();
</script>

<template>
  <Container
    v-if="progress === undefined"
    ref="animatedCircleRef"
    event-mode="none"
  >
    <Graphics
      event-mode="none"
      @render="
        (graphics: GraphicsInst) => {
          graphics.clear();
          graphics.beginFill($colors.nodeProgressBar);
          graphics.drawCircle(6, $shapes.nodeStatusHeight / 2, 4);
          graphics.endFill();
        }
      "
    />
  </Container>

  <template v-else>
    <Text
      event-mode="none"
      :fill="$colors.text.default"
      :x="$shapes.nodeSize / 2"
      :y="1"
      :anchor="{ x: 0.5, y: 0 }"
      :style="nodeStateText.styles"
      :scale="nodeStateText.downscalingFactor"
    >
      {{ progressDisplayPercentage }}%
    </Text>

    <Graphics
      event-mode="none"
      @render="
        (graphics: GraphicsInst) => {
          graphics.clear();
          graphics.beginFill($colors.nodeProgressBar);
          graphics.drawRoundedRect(
            0,
            0,
            progressBarWidth,
            $shapes.nodeStatusHeight,
            1,
          );
          graphics.endFill();
        }
      "
    />

    <Container event-mode="none" :mask="$refs.textMask as any">
      <Graphics
        ref="textMask"
        :is-mask="true"
        @render="
          (graphics: GraphicsInst) => {
            graphics.clear();
            graphics.beginFill(0xffffff);
            graphics.drawRoundedRect(
              0,
              0,
              progressBarWidth,
              $shapes.nodeStatusHeight,
              1,
            );
            graphics.endFill();
          }
        "
      />

      <Text
        event-mode="none"
        :fill="$colors.text.default"
        :x="$shapes.nodeSize / 2"
        :y="1"
        :anchor="{ x: 0.5, y: 0 }"
        :style="{ ...nodeStateText.styles, fill: 'white' }"
        :scale="nodeStateText.downscalingFactor"
      >
        {{ progressDisplayPercentage }}%
      </Text>
    </Container>
  </template>
</template>
