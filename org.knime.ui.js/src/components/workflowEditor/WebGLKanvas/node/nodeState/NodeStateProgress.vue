<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
import type { Container } from "pixi.js";

import type { NodeState } from "@/api/gateway-api/generated-api";
import * as $shapes from "@/style/shapes";
import type { ContainerInst, GraphicsInst } from "@/vue3-pixi";
import { useAnimatePixiContainer } from "../../common/useAnimatePixiContainer";
import { nodeStateText } from "../../util/textStyles";

type Props = {
  progress?: number;
  executionState?: NodeState.ExecutionStateEnum;
  textResolution?: number;
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

const ANIMATION_X_OFFSET = 20;

const animatedCircleRef = useTemplateRef<ContainerInst>("animatedCircleRef");
useAnimatePixiContainer<number>({
  initialValue: 0,
  targetValue: ANIMATION_X_OFFSET,
  targetDisplayObject: animatedCircleRef,
  animationParams: {
    duration: 0.8,
    // eslint-disable-next-line no-magic-numbers
    ease: [0.5, 0, 0.5, 1],
    repeat: Infinity,
    repeatType: "reverse",
  },
  onUpdate: (value) => {
    animatedCircleRef.value!.x = value;
  },
});
</script>

<template>
  <Container v-if="progress === undefined" ref="animatedCircleRef">
    <Graphics
      @render="
        (graphics: GraphicsInst) => {
          graphics.clear();
          graphics.circle(6, $shapes.nodeStatusHeight / 2, 4);
          graphics.fill($colors.nodeProgressBar);
        }
      "
    />
  </Container>

  <template v-else>
    <Text
      :fill="$colors.text.default"
      :x="$shapes.nodeSize / 2"
      :y="1"
      :anchor="{ x: 0.5, y: 0 }"
      :style="nodeStateText.styles"
      :resolution="textResolution"
    >
      {{ progressDisplayPercentage }}%
    </Text>

    <Graphics
      @render="
        (graphics: GraphicsInst) => {
          graphics.clear();
          graphics.roundRect(
            0,
            0,
            progressBarWidth,
            $shapes.nodeStatusHeight,
            1,
          );
          graphics.fill($colors.nodeProgressBar);
        }
      "
    />

    <Container :mask="$refs.textMask as any">
      <Graphics
        ref="textMask"
        :is-mask="true"
        @render="
          (graphics: GraphicsInst) => {
            graphics.clear();
            graphics.roundRect(
              0,
              0,
              progressBarWidth,
              $shapes.nodeStatusHeight,
              1,
            );
            graphics.fill(0xffffff);
          }
        "
      />

      <Text
        :fill="$colors.text.default"
        :x="$shapes.nodeSize / 2"
        :y="1"
        :anchor="{ x: 0.5, y: 0 }"
        :style="{ ...nodeStateText.styles, fill: 'white' }"
        :resolution="textResolution"
      >
        {{ progressDisplayPercentage }}%
      </Text>
    </Container>
  </template>
</template>
