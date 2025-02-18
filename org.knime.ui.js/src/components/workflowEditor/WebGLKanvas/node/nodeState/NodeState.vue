<!-- eslint-disable no-undefined -->
<script setup lang="ts">
import { computed } from "vue";
import { type Container, Graphics } from "pixi.js";
import type { GraphicsInst } from "@/vue3-pixi";

import { NodeState } from "@/api/gateway-api/generated-api";
import * as $colors from "@/style/colors";
import * as $shapes from "@/style/shapes";
import { nodeStateText } from "../../util/textStyles";

import NodeStateIssues from "./NodeStateIssues.vue";
import NodeStateProgress from "./NodeStateProgress.vue";

type Props = NodeState & {
  loopStatus?: string;
};

const props = withDefaults(defineProps<Props>(), {
  executionState: undefined,
  progress: undefined,
  progressMessages: () => [],
  error: undefined,
  warning: undefined,
  issue: undefined,
  resolutions: () => [],
  loopStatus: undefined,
});

/**
 * sets the different lights of the traffic light
 * @returns {[boolean, boolean, boolean] | undefined}
 * @example [true, false, false] means [red: on, yellow: off, green: off]
 * @example 'undefined' means no traffic light should be shown
 */
const trafficLight = computed(() => {
  const defaultValue = [false, false, false];
  const stateMapper: Partial<
    Record<NodeState.ExecutionStateEnum, [boolean, boolean, boolean]>
  > = {
    IDLE: [true, false, false],
    CONFIGURED: [false, true, false],
    EXECUTED: [false, false, true],
    HALTED: [false, false, true], // TODO NXT-279: for now halted is the same state as executed
  };

  if (props.executionState && props.executionState in stateMapper) {
    return stateMapper[props.executionState];
  }

  return props.executionState === null ? defaultValue : null;
});

const fillColor = (active: boolean, index: number) => {
  const activeColor = (["red", "yellow", "green"] as const)[index];

  return active
    ? $colors.trafficLight[activeColor]
    : $colors.trafficLight.inactive;
};

const strokeColor = (active: boolean, index: number) => {
  const activeColor = (["redBorder", "yellowBorder", "greenBorder"] as const)[
    index
  ];

  return active
    ? $colors.trafficLight[activeColor]
    : $colors.trafficLight.inactiveBorder;
};
</script>

<template>
  <Container
    name="NodeState"
    event-mode="none"
    :y="$shapes.nodeSize + $shapes.nodeStatusMarginTop"
  >
    <Graphics
      event-mode="none"
      @render="
        (graphics: GraphicsInst) => {
          graphics.clear();
          graphics.beginFill($colors.trafficLight.background);
          graphics.lineStyle(0.3, $colors.darkeningMask);
          graphics.drawRoundedRect(
            0,
            0,
            $shapes.nodeSize,
            $shapes.nodeStatusHeight,
            1,
          );
          graphics.endFill();
        }
      "
    />

    <template v-if="trafficLight">
      <template v-for="(active, index) of trafficLight" :key="index">
        <Graphics
          event-mode="none"
          name="TrafficLightBorder"
          @render="
            (graphics: GraphicsInst) => {
              graphics.clear();
              graphics.beginFill(fillColor(active, index));
              graphics.drawCircle(6 + 10 * index, 6, 4);
              graphics.endFill();
            }
          "
        />

        <Graphics
          event-mode="none"
          name="TrafficLightCircle"
          @render="
            (graphics: GraphicsInst) => {
              graphics.clear();
              graphics.lineStyle(1, strokeColor(active, index));
              graphics.drawCircle(6 + 10 * index, 6, 3.5);
              graphics.endFill();
            }
          "
        />
      </template>
    </template>

    <Text
      v-else-if="executionState === 'QUEUED'"
      event-mode="none"
      :x="$shapes.nodeSize / 2"
      :anchor="{ x: 0.5, y: 0 }"
      :style="nodeStateText.styles"
      :scale="nodeStateText.downscalingFactor"
    >
      {{ loopStatus && loopStatus === "PAUSED" ? "paused" : "queued" }}
    </Text>

    <template v-else-if="executionState === 'EXECUTING'">
      <NodeStateProgress
        :progress="progress"
        :execution-state="executionState"
      />
    </template>

    <NodeStateIssues
      v-if="error || warning"
      :error="error"
      :warning="warning"
    />
  </Container>
</template>
