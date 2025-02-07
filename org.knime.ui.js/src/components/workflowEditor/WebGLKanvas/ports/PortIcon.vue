<script setup lang="ts">
/* eslint-disable no-magic-numbers */
import { computed } from "vue";
import type { GraphicsInst } from "vue3-pixi";

import * as portColors from "@knime/styles/colors/portColors";

import type { PortType } from "@/api/gateway-api/generated-api";
import { portSize } from "@/style/shapes";

const strokeWidth = 1.4; // 1.4px

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

const tablePortRenderFn = (graphics: GraphicsInst) => {
  graphics.clear();
  graphics.lineStyle(strokeWidth, portColor.value);
  graphics.beginFill(portColor.value, props.filled ? 1 : 0);
  graphics.drawPolygon(trianglePath.value);
  graphics.endFill();
};

const flowVariablePortRenderFn = (graphics: GraphicsInst) => {
  graphics.clear();
  graphics.lineStyle(strokeWidth, portColor.value);
  graphics.beginFill(portColor.value, props.filled ? 1 : 0);
  graphics.drawCircle(0, 0, portSize / 2 - 1);
  graphics.endFill();
};

const otherPortsRenderFn = (graphics: GraphicsInst) => {
  graphics.clear();
  graphics.lineStyle(strokeWidth, portColor.value);
  graphics.beginFill(portColor.value, props.filled ? 1 : 0);
  graphics.drawRect(0, 0, portSize, portSize);
  graphics.endFill();
};
</script>

<template>
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
</template>
