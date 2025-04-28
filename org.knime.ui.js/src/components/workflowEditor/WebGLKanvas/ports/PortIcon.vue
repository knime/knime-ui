<script setup lang="ts">
/* eslint-disable no-magic-numbers */
import { computed, toRefs, useTemplateRef } from "vue";
import { AlphaFilter } from "pixi.js";

import type { MetaNodePort, PortType } from "@/api/gateway-api/generated-api";
import * as $colors from "@/style/colors";
import { portSize } from "@/style/shapes";
import { type ContainerInst, type GraphicsInst } from "@/vue3-pixi";
import { useAnimatePixiContainer } from "../common/useAnimatePixiContainer";

const portColors = $colors.portColors;
const trafficLightColors = $colors.trafficLight;

const strokeWidth = 1.5;
const metanodePortLightOffset = -5.5;

interface Props {
  type: PortType.KindEnum;
  color: string;
  filled: boolean;
  targeted?: boolean;
  hovered?: boolean;
  inactive?: boolean;
  nodeState?: MetaNodePort.NodeStateEnum;
}

const props = defineProps<Props>();

const trianglePath = computed(() => {
  // draw triangle around middle point
  let [x1, y1, x2, y3] = [
    -portSize / 2,
    -portSize / 2,
    portSize / 2,
    portSize / 2,
  ];

  // y and d are chosen so the triangle (including strokeWidth) fits precisely in the 9x9 port
  const d = Math.sqrt(5) / 2;
  const y = d / 2 + 1 / 4;

  // move points towards the center of the triangle according to strokeWidth
  x1 += strokeWidth / 2;
  x2 -= strokeWidth * d;
  y1 += strokeWidth * y;
  y3 -= strokeWidth * y;

  // draw triangle clock-wise
  return [
    { x: x1, y: y1 },
    { x: x2, y: 0 },
    { x: x1, y: y3 },
  ];
});

const portColor = computed(() => {
  return portColors[props.type] || props.color;
});

const tablePortRenderFn = (graphics: GraphicsInst) => {
  graphics.clear();
  graphics.poly(trianglePath.value);
  graphics.stroke({ width: strokeWidth, color: portColor.value });
  graphics.fill({ color: portColor.value, alpha: props.filled ? 1 : 0 });
};

const flowVariablePortRenderFn = (graphics: GraphicsInst) => {
  graphics.clear();
  if (props.filled) {
    graphics.circle(0, 0, portSize / 2);
    graphics.fill({ color: portColor.value });
  } else {
    graphics.circle(0, 0, (portSize - strokeWidth / 2) / 2 - 0.2);
    graphics.stroke({ color: portColor.value, width: strokeWidth });
  }
};

const otherPortsRenderFn = (graphics: GraphicsInst) => {
  graphics.clear();
  graphics.rect(
    strokeWidth / 2,
    strokeWidth / 2,
    portSize - strokeWidth,
    portSize - strokeWidth,
  );
  graphics.stroke({ color: portColor.value, width: strokeWidth });
  graphics.fill({ color: portColor.value, alpha: props.filled ? 1 : 0 });
};

const portIcon = useTemplateRef<ContainerInst>("portIcon");
const { hovered, targeted } = toRefs(props);

useAnimatePixiContainer<number>({
  initialValue: 1,
  targetValue: 1.2,
  targetDisplayObject: portIcon,
  changeTracker: computed(() => hovered.value || targeted.value),
  animationParams: { duration: 0.17, ease: [0.8, 2, 1, 2.5] },
  onUpdate: (value) => {
    portIcon.value!.scale.x = value;
    portIcon.value!.scale.y = value;
  },
});

// inactive port
const createOutlinePoints = (portSize: number, width: number) => {
  const offset = width / 2;

  // diagonal 1
  const d1 = [
    { x: -portSize / 2 - offset, y: -portSize / 2 + offset },
    { x: -portSize / 2 + offset, y: -portSize / 2 - offset },
    { x: portSize / 2 + offset, y: portSize / 2 - offset },
    { x: portSize / 2 - offset, y: portSize / 2 + offset },
  ];

  // diagonal 2
  const d2 = [
    { x: portSize / 2 - offset, y: -portSize / 2 - offset },
    { x: portSize / 2 + offset, y: -portSize / 2 + offset },
    { x: -portSize / 2 + offset, y: portSize / 2 + offset },
    { x: -portSize / 2 - offset, y: portSize / 2 - offset },
  ];

  // cross mid points
  const middles = [
    { x: -width, y: 0 },
    { x: 0, y: -width },
    { x: width, y: 0 },
    { x: 0, y: width },
  ];

  // ordered points to trace X outline
  return [
    middles[0],
    d1[0],
    d1[1],
    middles[1],
    d2[0],
    d2[1],
    middles[2],
    d1[2],
    d1[3],
    middles[3],
    d2[2],
    d2[3],
  ];
};

const renderOutlineX = (graphics: GraphicsInst) => {
  const points = createOutlinePoints(portSize, 2);

  graphics.poly(points).fill({ color: portColors.inactiveOutline });
};

const renderX = (graphics: GraphicsInst) => {
  graphics
    .moveTo(-portSize / 2, -portSize / 2)
    .lineTo(portSize / 2, portSize / 2)
    .moveTo(-portSize / 2, portSize / 2)
    .lineTo(portSize / 2, -portSize / 2)
    .stroke({
      width: 1.5,
      color: portColors.inactive,
    });
};

const trafficLightState = () => {
  if (props.nodeState) {
    return {
      IDLE: "red",
      CONFIGURED: "yellow",
      EXECUTING: "blue",
      QUEUED: "yellow",
      HALTED: "green",
      EXECUTED: "green",
    }[props.nodeState];
  }
};

const renderMetanodeTrafficLight = (graphics: GraphicsInst) => {
  graphics.clear();
  const stateColor = trafficLightState()!;
  graphics.circle(0, 0, 3.75).fill({ color: $colors.White });
  graphics.circle(0, 0, 3).fill({ color: trafficLightColors[stateColor] });
};
const renderMetanodeTrafficLightBorder = (graphics: GraphicsInst) => {
  graphics.clear();
  const stateColor = trafficLightState();
  const radius = 2.5;
  graphics.circle(0, 0, radius);
  if (stateColor === "green") {
    graphics.moveTo(-metanodePortLightOffset / 2, 0);
    graphics.lineTo(-radius, 0);
  } else if (stateColor === "yellow") {
    graphics.moveTo(0, -radius).lineTo(0, radius);
  }

  graphics.stroke({
    color:
      trafficLightColors[
        `${stateColor}Border${stateColor === "yellow" ? "WebGL" : ""}`
      ],
  });
  if (stateColor === "yellow") {
    graphics.filters = [
      new AlphaFilter({
        alpha: trafficLightColors.yellowBorderWebGLAlpha,
        antialias: true,
      }),
    ];
  }
};
</script>

<template>
  <Container ref="portIcon">
    <Graphics v-if="type === 'table'" @render="tablePortRenderFn" />

    <Graphics
      v-else-if="type === 'flowVariable'"
      @render="flowVariablePortRenderFn"
    />

    <Graphics
      v-else
      :position="{ x: -portSize / 2, y: -portSize / 2 }"
      @render="otherPortsRenderFn"
    />

    <!-- X outline -->
    <Graphics v-if="inactive" @render="renderOutlineX" />

    <!-- X -->
    <Graphics v-if="inactive" @render="renderX" />

    <!-- Metanode traffic light -->
    <Container v-if="trafficLightState()" :x="metanodePortLightOffset">
      <Graphics @render="renderMetanodeTrafficLight" />
      <Graphics @render="renderMetanodeTrafficLightBorder" />
    </Container>
  </Container>
</template>
