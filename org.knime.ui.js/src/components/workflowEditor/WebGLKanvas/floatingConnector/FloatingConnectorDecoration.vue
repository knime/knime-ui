<script setup lang="ts">
import { computed } from "vue";

import PlusIcon from "@knime/styles/img/icons/plus-small.svg?raw";

import type { NodeRelation } from "@/api/custom-types";
import type { XY } from "@/api/gateway-api/generated-api";
import * as $shapes from "@/style/shapes";
import { DashLine } from "@/util/pixi-dash-line";

type Props = {
  position: XY;
  nodeRelation?: NodeRelation;
};

const props = defineProps<Props>();

const translatePosition = computed(() => {
  const { x, y } = props.position;

  return props.nodeRelation === "PREDECESSORS"
    ? { x: x - $shapes.addNodeGhostSize - $shapes.portSize, y }
    : props.position;
});
</script>

<template>
  <Container
    label="FloatingConnectorDecoration"
    :position="translatePosition"
    :pivot="{ x: -$shapes.portSize / 2, y: $shapes.addNodeGhostSize / 2 }"
    event-mode="none"
  >
    <Graphics
      label="FloatingConnectorDecorationRender"
      @render="
        (graphics) => {
          graphics.clear();
          graphics.roundRect(
            0,
            0,
            $shapes.addNodeGhostSize,
            $shapes.addNodeGhostSize,
            1,
          );
          graphics.fill($colors.GrayUltraLight);
        }
      "
    />

    <Graphics
      label="FloatingConnectorDecorationBorder"
      @render="
        (graphics) => {
          graphics.clear();
          const dash = new DashLine(graphics, { dash: [2, 2] });
          dash.roundRect(
            0,
            0,
            $shapes.addNodeGhostSize,
            $shapes.addNodeGhostSize,
            1,
          );
          graphics.stroke({ width: 1, color: $colors.SilverSand });
        }
      "
    />

    <Graphics
      label="FloatingConnectorDecorationIcon"
      :scale="0.7"
      :pivot="1.5"
      @render="
        (graphics) => {
          graphics.svg(PlusIcon);
        }
      "
    />
  </Container>
</template>
