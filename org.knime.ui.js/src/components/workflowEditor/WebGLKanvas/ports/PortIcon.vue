<script setup lang="ts">
/* eslint-disable no-magic-numbers */
import { computed } from "vue";
import { type Graphics } from "pixi.js";

import type { PortType } from "@/api/gateway-api/generated-api";
import { portColors } from "@/style/colors";
import { portSize } from "@/style/shapes";

const strokeWidth = 1.5;

interface Props {
  type: PortType.KindEnum;
  color: string;
  filled: boolean;
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

const tablePortRenderFn = (graphics: Graphics) => {
  graphics.clear();
  graphics.poly(trianglePath.value);
  graphics.stroke({ width: strokeWidth, color: portColor.value });
  graphics.fill({ color: portColor.value, alpha: props.filled ? 1 : 0 });
};

const flowVariablePortRenderFn = (graphics: Graphics) => {
  graphics.clear();
  if (props.filled) {
    graphics.circle(0, 0, portSize / 2);
    graphics.fill({ color: portColor.value });
  } else {
    graphics.circle(0, 0, (portSize - strokeWidth / 2) / 2 - 0.2);
    graphics.stroke({ color: portColor.value, width: strokeWidth });
  }
};

const otherPortsRenderFn = (graphics: Graphics) => {
  graphics.clear();
  if (props.filled) {
    graphics.rect(0, 0, portSize, portSize);
    graphics.fill({ color: portColor.value });
  } else {
    graphics.rect(
      0 + strokeWidth / 2,
      0 + strokeWidth / 2,
      portSize - strokeWidth,
      portSize - strokeWidth,
    );
    graphics.stroke({ color: portColor.value, width: strokeWidth });
  }
};
</script>

<template>
  <Container>
    <Graphics v-if="type === 'table'" @effect="tablePortRenderFn" />

    <Graphics
      v-else-if="type === 'flowVariable'"
      @render="flowVariablePortRenderFn"
    />

    <Graphics
      v-else
      :position="{ x: -portSize / 2, y: -portSize / 2 }"
      @render="otherPortsRenderFn"
    />
  </Container>
</template>
