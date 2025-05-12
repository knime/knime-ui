<script setup lang="ts">
import { computed } from "vue";
import { Graphics } from "pixi.js";

import * as $colors from "@/style/colors";
import { type GraphicsInst } from "@/vue3-pixi";

interface Props {
  nodeState: string;
}

const props = defineProps<Props>();

const trafficLightColor = computed(() => {
  return {
    IDLE: "red",
    CONFIGURED: "yellow",
    EXECUTING: "blue",
    QUEUED: "yellow",
    HALTED: "green",
    EXECUTED: "green",
  }[props.nodeState] as "red" | "yellow" | "green" | "blue" | undefined;
});

/* eslint-disable no-magic-numbers */
const renderTrafficLight = (graphics: GraphicsInst) => {
  graphics
    .circle(0, 0, 3.75)
    .fill({ color: $colors.White })
    .circle(0, 0, 3)
    .fill({ color: $colors.trafficLight[trafficLightColor.value!] });

  graphics.circle(0, 0, 2.5);
  if (
    trafficLightColor.value === "yellow" ||
    trafficLightColor.value === "green"
  ) {
    // this is adapted from the SVG path, to avoid overlapping with the circle with a half-transparent stroke
    graphics.moveTo(-2, 0).lineTo(2, 0);
  }

  graphics.angle = trafficLightColor.value === "yellow" ? 90 : 0;

  graphics.stroke({
    width: 1,
    color: $colors.trafficLight[`${trafficLightColor.value}Border`],
    join: "round",
  });
};
/* eslint-enable no-magic-numbers */
</script>

<template>
  <Graphics
    v-if="trafficLightColor"
    :position-x="-($shapes.portSize / 2 + 1)"
    position-y="0"
    @render="renderTrafficLight"
  />
</template>
