<script setup lang="ts">
import { computed, toRefs } from "vue";
import { storeToRefs } from "pinia";
import type { GraphicsInst } from "vue3-pixi";

import { useConnectorPosition } from "@/composables/useConnectorPosition";
import { useSelectionStore } from "@/store/selection";
import { useMovingStore } from "@/store/workflow/moving";
import { portSize } from "@/style/shapes";
import type { ConnectorProps } from "../types";

// eslint-disable-next-line no-magic-numbers
const deltaX1 = portSize / 2 - 0.5;
// eslint-disable-next-line no-magic-numbers
const deltaX2 = portSize / 2 - 0.5;

const getBezier = (x1: number, y1: number, x2: number, y2: number) => {
  x1 += deltaX1;
  x2 -= deltaX2;
  const width = Math.abs(x1 - x2);
  const height = Math.abs(y1 - y2);
  const widthHalf = width / 2;
  // eslint-disable-next-line no-magic-numbers
  const heightThird = height / 3;
  const bezier = {
    start: { x: x1, y: y1 },
    control1: { x: x1 + widthHalf + heightThird, y: y1 },
    control2: { x: x2 - widthHalf - heightThird, y: y2 },
    end: { x: x2, y: y2 },
  };
  return bezier;
};

const props = withDefaults(defineProps<ConnectorProps>(), {
  sourceNode: null,
  sourcePort: null,
  destNode: null,
  destPort: null,
  absolutePoint: null,
  interactive: true,
});

const { isDragging, movePreviewDelta } = storeToRefs(useMovingStore());
const { isNodeSelected } = storeToRefs(useSelectionStore());

const { sourceNode, sourcePort, destNode, destPort, id, absolutePoint } =
  toRefs(props);

const { start, end } = useConnectorPosition({
  sourceNode,
  destNode,
  sourcePort,
  destPort,
  absolutePoint,
});

const moveDeltas = computed(() => {
  let x1 = 0;
  let y1 = 0;
  let x2 = 0;
  let y2 = 0;

  if (isDragging.value) {
    if (props.sourceNode && isNodeSelected.value(props.sourceNode)) {
      x1 += movePreviewDelta.value.x;
      y1 += movePreviewDelta.value.y;
    }
    if (props.destNode && isNodeSelected.value(props.destNode)) {
      x2 += movePreviewDelta.value.x;
      y2 += movePreviewDelta.value.y;
    }
  }

  return [x1, y1, x2, y2];
});

const linePoints = computed<[number, number, number, number]>(() => {
  const x1 = start.value.x;
  const y1 = start.value.y;
  const x2 = end.value.x;
  const y2 = end.value.y;

  const [mx1, my1, mx2, my2] = moveDeltas.value;

  return [x1 + mx1, y1 + my1, x2 + mx2, y2 + my2];
});

const bezierPoints = computed<[number, number, number, number, number, number]>(
  () => {
    const [x1, y1, x2, y2] = linePoints.value;

    const bezier = getBezier(x1, y1, x2, y2);
    return [
      bezier.control1.x,
      bezier.control1.y,
      bezier.control2.x,
      bezier.control2.y,
      bezier.end.x,
      bezier.end.y,
    ];
  },
);
</script>

<template>
  <graphics
    :name="id"
    @render="
      (graphics: GraphicsInst) => {
        graphics.clear();
        graphics
          .lineStyle(2, 0x000000, 1)
          .moveTo(linePoints.at(0)!, linePoints.at(1)!)
          .bezierCurveTo(...bezierPoints);

        graphics.endFill();
      }
    "
  />
</template>
