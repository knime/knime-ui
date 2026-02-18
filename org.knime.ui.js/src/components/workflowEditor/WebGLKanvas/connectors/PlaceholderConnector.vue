<!-- eslint-disable no-undefined -->
<script setup lang="ts">
import { type Ref, computed, toRefs } from "vue";
import type { LineCap } from "pixi.js";

import type { ComponentPlaceholderConnection } from "@/api/custom-types";
import { DashLine } from "@/lib/pixi-dash-line";
import * as $colors from "@/style/colors";
import * as $shapes from "@/style/shapes";
import type { GraphicsInst } from "@/vue3-pixi";
import { type BezierPoints, getBezier } from "../../util/connectorPath";

import { usePlaceholderConnectorPosition } from "./usePlaceholderConnectorPosition";

type Props = ComponentPlaceholderConnection;

const props = defineProps<Props>();

const { sourceNode, sourcePort, destNode, destPort, id, placeholderType } =
  toRefs(props);

const { start, end } = usePlaceholderConnectorPosition({
  sourceNode: sourceNode as Ref<string>,
  sourcePort: sourcePort as Ref<number>,
  destNode: destNode as Ref<string>,
  destPort: destPort as Ref<number>,
  placeholderType,
});

const bezier = computed(() => {
  const x1 = start.value.x;
  const y1 = start.value.y;
  const x2 = end.value.x;
  const y2 = end.value.y;

  return getBezier(x1, y1, x2, y2);
});

const offsetStart = $shapes.connectorWidth / 2;
const offsetEnd = -(($shapes.connectorWidth + 1) / 2);
const stroke = {
  width: $shapes.connectorWidth,
  color: $colors.StoneGray,
  cap: "square" as LineCap,
};

const renderConnector = (graphics: GraphicsInst, points: BezierPoints) => {
  graphics.clear();

  const dashedLine = new DashLine(graphics, {
    // eslint-disable-next-line no-magic-numbers
    dash: [0.5, 2],
    ...stroke,
  });

  dashedLine
    .moveTo(points.start.x + offsetStart, points.start.y)
    .bezierCurveTo(
      points.control1.x,
      points.control1.y,
      points.control2.x,
      points.control2.y,
      points.end.x + offsetEnd,
      points.end.y,
    );

  graphics.stroke(stroke);
};
</script>

<template>
  <Container :label="`PlaceholderConnection__${id}`">
    <Graphics
      label="PlaceholderConnectionPath"
      event-mode="none"
      @render="renderConnector($event, bezier)"
    />

    <Graphics
      label="PlaceholderConnectionPortStub"
      :position="placeholderType === 'placeholder-in' ? end : start"
      @render="
        (graphics) => {
          graphics.clear();

          const x = 0;
          const y = 0;
          const radius = $shapes.portSize / 2;
          graphics.circle(x, y, radius);
          graphics.fill($colors.White);

          const dash = new DashLine(graphics, { dash: [0.6, 1] });
          dash.circle(x, y, radius);
          graphics.stroke({ width: 1, color: $colors.StoneGray });
        }
      "
    />
  </Container>
</template>
