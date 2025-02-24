<!-- eslint-disable no-magic-numbers -->
<!-- eslint-disable func-style -->
<script setup lang="ts">
import { computed, ref, toRefs, watch } from "vue";
import gsap from "gsap";
import { storeToRefs } from "pinia";

import type { XY } from "@/api/gateway-api/generated-api";
import { useConnectorPosition } from "@/composables/useConnectorPosition";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useFloatingConnectorStore } from "@/store/floatingConnector/floatingConnector";
import { isPlaceholderPort } from "@/store/floatingConnector/types";
import { useSelectionStore } from "@/store/selection";
import { useMovingStore } from "@/store/workflow/moving";
import * as $colors from "@/style/colors";
import { portSize } from "@/style/shapes";
import { geometry } from "@/util/geometry";
import type { GraphicsInst } from "@/vue3-pixi";
import type { ConnectorProps } from "../types";

const deltaX1 = portSize / 2 - 0.5;
const deltaX2 = portSize / 2 - 0.5;

const getBezier = (x1: number, y1: number, x2: number, y2: number) => {
  x1 += deltaX1;
  x2 -= deltaX2;
  const width = Math.abs(x1 - x2);
  const height = Math.abs(y1 - y2);
  const widthHalf = width / 2;

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
const { visibleArea } = storeToRefs(useWebGLCanvasStore());

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

const linePoints = computed<[number, number, number, number]>(() => {
  const x1 = start.value.x;
  const y1 = start.value.y;
  const x2 = end.value.x;
  const y2 = end.value.y;

  const [mx1, my1, mx2, my2] = moveDeltas.value;

  return [x1 + mx1, y1 + my1, x2 + mx2, y2 + my2];
});

const { floatingConnector, snapTarget } = storeToRefs(
  useFloatingConnectorStore(),
);

const isTargetForReplacement = computed(() => {
  // is the global drag connector itself
  if (!floatingConnector.value || props.absolutePoint) {
    return false;
  }

  // targetting the end of the connection from another port
  if (
    snapTarget.value &&
    !isPlaceholderPort(snapTarget.value) &&
    props.destNode === snapTarget.value.parentNodeId &&
    snapTarget.value.index === props.destPort
  ) {
    return true;
  }

  // attempting a connection from a connected input port
  if (
    props.destNode === floatingConnector.value.context.parentNodeId &&
    props.destPort === floatingConnector.value.context.portInstance.index &&
    floatingConnector.value.context.origin === "in"
  ) {
    return true;
  }

  return false;
});

const bezierPoints = computed(() => {
  const [x1, y1, x2, y2] = linePoints.value;

  return getBezier(x1, y1, x2, y2);
});

const renderFn = (
  graphics: GraphicsInst,
  points: ReturnType<typeof getBezier>,
) => {
  const color = props.flowVariableConnection ? $colors.Coral : $colors.Masala;
  graphics
    .clear()
    .moveTo(linePoints.value.at(0)!, linePoints.value.at(1)!)
    .bezierCurveTo(
      points.control1.x,
      points.control1.y,
      points.control2.x,
      points.control2.y,
      points.end.x,
      points.end.y,
    )
    .stroke({ width: 1, color });
};

const connectorPath = ref<GraphicsInst>();

const suggestShiftX = -12;
const suggestShiftY = -6;
watch(isTargetForReplacement, (newValue, oldValue) => {
  const [x1, y1, x2, y2] = linePoints.value;

  // flip the curves depending on the value of suggest delete
  // so that we have the animation in both directions

  const oldBezier = getBezier(
    x1,
    y1,
    x2 + (newValue && !oldValue ? 0 : suggestShiftX),
    y2 + (newValue && !oldValue ? 0 : suggestShiftY),
  );

  const newBezier = getBezier(
    x1,
    y1,
    x2 + (newValue && !oldValue ? suggestShiftX : 0),
    y2 + (newValue && !oldValue ? suggestShiftY : 0),
  );

  gsap.to(oldBezier.end, {
    x: newBezier.end.x,
    y: newBezier.end.y,
    duration: 0.2,
    ease: "power2.out",
    onUpdate: () => {
      renderFn(connectorPath.value!, oldBezier);
    },
  });
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

const boundingBox = computed(() =>
  getBoundingBox(
    start.value,
    { x: bezierPoints.value[0], y: bezierPoints.value[1] },
    { x: bezierPoints.value[2], y: bezierPoints.value[3] },
    { x: bezierPoints.value[4], y: bezierPoints.value[5] },
  ),
);

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
    :z-index="
      isNodeSelected(sourceNode ?? '') || isNodeSelected(destNode ?? '')
        ? $zIndices.webGlCanvasConnections
        : 0
    "
    :renderable="renderable"
    :label="`Connector__${id}`"
    @render="renderFn($event, bezierPoints)"
  />
</template>
