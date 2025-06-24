<script setup lang="ts">
import { computed } from "vue";

import * as $colors from "@/style/colors";
import * as $shapes from "@/style/shapes";
import type { GraphicsInst } from "@/vue3-pixi";
import { useZoomAwareResolution } from "../../common/useZoomAwareResolution";
import { placeholderProgressText } from "../../util/textStyles";

type Props = {
  progress?: number;
};

const props = defineProps<Props>();

const { resolution } = useZoomAwareResolution();

const progressPercentile = computed(() => {
  if (!props.progress) {
    return "0%";
  }

  return `${Math.floor(props.progress * 100)}%`;
});

const renderProgressBorder = (graphics: GraphicsInst) => {
  graphics.clear();

  const radius = $shapes.nodeTorsoRadius;
  const side = $shapes.nodeSize;
  const progress = props.progress ?? 0;
  // eslint-disable-next-line no-magic-numbers
  const totalLength = 4 * (side - 2 * radius + (Math.PI / 2) * radius);
  let remaining = totalLength * progress;

  graphics.setStrokeStyle({
    width: $shapes.selectedNodeStrokeWidth,
    color: $colors.kanvasNodeSelection.activeBorder,
    alpha: 1,
  });
  graphics.beginPath();

  const drawArc = (
    cx: number,
    cy: number,
    start: number,
    end: number,
  ): number => {
    const length = Math.abs(end - start) * radius;
    if (remaining <= 0) {
      return 0;
    }
    const sweep = Math.min(length, remaining);
    const actualEnd = start + sweep / radius;
    graphics.moveTo(
      cx + radius * Math.cos(start),
      cy + radius * Math.sin(start),
    );
    graphics.arc(cx, cy, radius, start, actualEnd);
    return sweep;
  };

  const drawLine = (x1: number, y1: number, x2: number, y2: number): number => {
    const length = Math.hypot(x2 - x1, y2 - y1);
    if (remaining <= 0) {
      return 0;
    }
    const drawLength = Math.min(length, remaining);
    const drawProgress = drawLength / length;
    graphics.moveTo(x1, y1);
    graphics.lineTo(
      x1 + (x2 - x1) * drawProgress,
      y1 + (y2 - y1) * drawProgress,
    );
    return drawLength;
  };

  const radius2 = side - radius;
  const steps = [
    /* eslint-disable no-magic-numbers */
    () => drawLine(radius, 0, radius2, 0),
    () => drawArc(radius2, radius, -Math.PI / 2, 0),
    () => drawLine(side, radius, side, radius2),
    () => drawArc(radius2, radius2, 0, Math.PI / 2),
    () => drawLine(radius2, side, radius, side),
    () => drawArc(radius, radius2, Math.PI / 2, Math.PI),
    () => drawLine(0, radius2, 0, radius),
    () => drawArc(radius, radius, Math.PI, 1.5 * Math.PI),
    /* eslint-enable no-magic-numbers */
  ];

  for (const step of steps) {
    remaining -= step();
    if (remaining <= 0) {
      break;
    }
  }

  graphics.stroke();
};
</script>

<template>
  <Container label="PlaceholderLoading">
    <Text
      :resolution="resolution"
      :round-pixels="true"
      :text="progressPercentile"
      :style="placeholderProgressText.styles"
      :anchor="0.5"
      :x="$shapes.nodeSize / 2 + 1"
      :y="$shapes.nodeSize / 2 - 2"
    />

    <Graphics
      @render="
        (graphics: GraphicsInst) => {
          graphics.clear();
          graphics.roundRect(
            0,
            0,
            $shapes.nodeSize,
            $shapes.nodeSize,
            $shapes.nodeTorsoRadius,
          );
          graphics.stroke($colors.CornflowerSemi);
          graphics.fill({ alpha: 0 });
        }
      "
    />

    <Graphics @render="renderProgressBorder" />
  </Container>
</template>
