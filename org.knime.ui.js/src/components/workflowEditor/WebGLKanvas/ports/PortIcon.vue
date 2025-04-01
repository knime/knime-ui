<script setup lang="ts">
/* eslint-disable no-magic-numbers */
import { computed, toRefs, useTemplateRef } from "vue";

import * as portColors from "@knime/styles/colors/portColors";

import type { PortType } from "@/api/gateway-api/generated-api";
import { portSize } from "@/style/shapes";
import { type ContainerInst, type GraphicsInst } from "@/vue3-pixi";
import { useAnimatePixiContainer } from "../common/useAnimatePixiContainer";

const strokeWidth = 0.7;

interface Props {
  type: PortType.KindEnum;
  color: string;
  filled: boolean;
  targeted?: boolean;
  hovered?: boolean;
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
  graphics.stroke({ width: 1, color: portColor.value });
  graphics.fill({ color: portColor.value, alpha: props.filled ? 1 : 0 });
};

const flowVariablePortRenderFn = (graphics: GraphicsInst) => {
  graphics.clear();
  graphics.circle(0, 0, portSize / 2 - 0.2);
  graphics.fill({ color: portColor.value, alpha: props.filled ? 1 : 0 });
};

const otherPortsRenderFn = (graphics: GraphicsInst) => {
  graphics.clear();
  graphics.rect(0, 0, portSize, portSize);
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
  </Container>
</template>
