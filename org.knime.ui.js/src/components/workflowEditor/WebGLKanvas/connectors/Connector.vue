<!-- eslint-disable no-undefined -->
<!-- eslint-disable no-magic-numbers -->
<!-- eslint-disable func-style -->
<script setup lang="ts">
import { computed, ref, toRefs, watch } from "vue";
import { type AnimationPlaybackControls, animate } from "motion";
import { storeToRefs } from "pinia";

import type { XY } from "@/api/gateway-api/generated-api";
import { useConnectorPosition } from "@/composables/useConnectorPosition";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useFloatingConnectorStore } from "@/store/floatingConnector/floatingConnector";
import {
  isFullFloatingConnector,
  isPlaceholderPort,
} from "@/store/floatingConnector/types";
import { useSelectionStore } from "@/store/selection";
import { useMovingStore } from "@/store/workflow/moving";
import * as $colors from "@/style/colors";
import { portSize } from "@/style/shapes";
import { geometry } from "@/util/geometry";
import type { GraphicsInst } from "@/vue3-pixi";

import type { BezierPoints, ConnectorProps } from "./types";

const deltaX1 = portSize / 2 - 0.5;
const deltaX2 = portSize / 2 - 0.5;

const getBezier = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): BezierPoints => {
  x1 += deltaX1;
  x2 -= deltaX2;
  const width = Math.abs(x1 - x2);
  const height = Math.abs(y1 - y2);
  const widthHalf = width / 2;
  const heightThird = height / 3;

  return {
    start: { x: x1, y: y1 },
    control1: { x: x1 + widthHalf + heightThird, y: y1 },
    control2: { x: x2 - widthHalf - heightThird, y: y2 },
    end: { x: x2, y: y2 },
  };
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
const { visibleArea, isDebugModeEnabled } = storeToRefs(useWebGLCanvasStore());

const { sourceNode, sourcePort, destNode, destPort, id, absolutePoint } =
  toRefs(props);

const { start, end } = useConnectorPosition({
  sourceNode,
  destNode,
  sourcePort,
  destPort,
  absolutePoint: computed(() =>
    absolutePoint.value ? [absolutePoint.value.x, absolutePoint.value.y] : null,
  ),
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

const startEndWithMoveDeltas = computed<[number, number, number, number]>(
  () => {
    const x1 = start.value.x;
    const y1 = start.value.y;
    const x2 = end.value.x;
    const y2 = end.value.y;

    const [mx1, my1, mx2, my2] = moveDeltas.value;

    return [x1 + mx1, y1 + my1, x2 + mx2, y2 + my2];
  },
);

const renderFn = (graphics: GraphicsInst, points: BezierPoints) => {
  const color = props.flowVariableConnection ? $colors.Coral : $colors.Masala;
  graphics
    .clear()
    .moveTo(
      startEndWithMoveDeltas.value.at(0)!,
      startEndWithMoveDeltas.value.at(1)!,
    )
    .bezierCurveTo(
      points.control1.x,
      points.control1.y,
      points.control2.x,
      points.control2.y,
      points.end.x,
      points.end.y,
    )
    .stroke({
      width: 1,
      color: props.absolutePoint && isDebugModeEnabled.value ? "blue" : color,
    });
};

const { floatingConnector, snapTarget } = storeToRefs(
  useFloatingConnectorStore(),
);

const isTargetForReplacement = computed(() => {
  // is the global drag connector itself
  if (!floatingConnector.value || props.absolutePoint) {
    return false;
  }

  // targetting the input port that is already connected
  if (
    snapTarget.value &&
    !isPlaceholderPort(snapTarget.value) &&
    props.destNode === snapTarget.value.parentNodeId &&
    snapTarget.value.index === props.destPort &&
    floatingConnector.value.context.origin === "out"
  ) {
    return true;
  }

  // targetting the output port that is already connected
  if (
    isFullFloatingConnector(floatingConnector.value) &&
    props.destNode === floatingConnector.value.context.parentNodeId &&
    props.destPort === floatingConnector.value.context.portInstance.index &&
    floatingConnector.value.context.origin === "in"
  ) {
    return true;
  }

  return false;
});

const connectorPath = ref<GraphicsInst>();

const suggestShiftX = -12;
const suggestShiftY = -6;
let replacementAnimation: AnimationPlaybackControls | undefined;
watch(isTargetForReplacement, (shouldAnimate) => {
  const [x1, y1, x2, y2] = startEndWithMoveDeltas.value;
  const normalBezier = getBezier(x1, y1, x2, y2);
  const animatedBezier = getBezier(
    x1,
    y1,
    x2 + suggestShiftX,
    y2 + suggestShiftY,
  );

  if (shouldAnimate) {
    replacementAnimation = animate(
      normalBezier.end,
      { x: animatedBezier.end.x, y: animatedBezier.end.y },
      {
        duration: 0.2,
        ease: "easeOut",
        onUpdate: () => {
          if (replacementAnimation && !connectorPath.value) {
            replacementAnimation.stop();
            return;
          }

          renderFn(connectorPath.value!, normalBezier);
        },
      },
    );
  } else {
    replacementAnimation?.stop();
    replacementAnimation = undefined;
    renderFn(connectorPath.value!, normalBezier);
  }
});

function getBoundingBox(start: XY, ctrl1: XY, ctrl2: XY, end: XY) {
  const minX = Math.min(start.x, ctrl1.x, ctrl2.x, end.x);
  const maxX = Math.max(start.x, ctrl1.x, ctrl2.x, end.x);
  const minY = Math.min(start.y, ctrl1.y, ctrl2.y, end.y);
  const maxY = Math.max(start.y, ctrl1.y, ctrl2.y, end.y);

  return {
    left: minX,
    top: minY,
    width: maxX - minX,
    // make sure height is at least 1, otherwise it'd be 0 for straight lines
    height: Math.max(maxY - minY, 1),
  };
}

const boundingBox = computed(() => {
  const bezier = getBezier(...startEndWithMoveDeltas.value);
  return getBoundingBox(
    bezier.start,
    bezier.control1,
    bezier.control2,
    bezier.end,
  );
});

const renderable = computed(() => {
  const intersect = geometry.utils.rectangleIntersection(boundingBox.value, {
    left: visibleArea.value.x,
    top: visibleArea.value.y,
    width: visibleArea.value.width,
    height: visibleArea.value.height,
  });

  return Boolean(intersect);
});
</script>

<template>
  <Graphics
    ref="connectorPath"
    :renderable="renderable"
    :visible="renderable"
    :label="`Connector__${id}`"
    @render="renderFn($event, getBezier(...startEndWithMoveDeltas))"
  />
</template>
