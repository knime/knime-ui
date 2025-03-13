<!-- eslint-disable no-undefined -->
<!-- eslint-disable no-magic-numbers -->
<!-- eslint-disable func-style -->
<script setup lang="ts">
import { computed, ref, toRefs, watch } from "vue";
import { type AnimationPlaybackControls, animate } from "motion";
import { storeToRefs } from "pinia";
import type { FederatedPointerEvent } from "pixi.js";

import { getMetaOrCtrlKey } from "@knime/utils";

import type { XY } from "@/api/gateway-api/generated-api";
import { useConnectorPosition } from "@/composables/useConnectorPosition";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useFloatingConnectorStore } from "@/store/floatingConnector/floatingConnector";
import { isPlaceholderPort } from "@/store/floatingConnector/types";
import { useSelectionStore } from "@/store/selection";
import { useMovingStore } from "@/store/workflow/moving";
import * as $colors from "@/style/colors";
import * as $shapes from "@/style/shapes";
import { geometry } from "@/util/geometry";
import type { GraphicsInst } from "@/vue3-pixi";
import { type BezierPoints, getBezier } from "../../util/connectorPath";
import { useAnimatePixiContainer } from "../common/useAnimatePixiContainer";

import type { ConnectorProps } from "./types";

const props = withDefaults(defineProps<ConnectorProps>(), {
  sourceNode: null,
  sourcePort: null,
  destNode: null,
  destPort: null,
  absolutePoint: null,
  interactive: true,
});

const { isDragging, movePreviewDelta } = storeToRefs(useMovingStore());
const selectionStore = useSelectionStore();
const { isNodeSelected, isConnectionSelected } = storeToRefs(selectionStore);
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

const isSelected = computed(
  () => isConnectionSelected.value(props.id) && !isDragging.value,
);
const isHovered = ref(false);

const getConnectorColor = (isHoverArea: boolean) => {
  if (isHoverArea) {
    return isDebugModeEnabled.value ? "green" : "white";
  }

  if (isSelected.value) {
    return $colors.Cornflower;
  }

  const connectorColor = props.flowVariableConnection
    ? $colors.Coral
    : $colors.StoneGray;

  return props.absolutePoint && isDebugModeEnabled.value
    ? "blue"
    : connectorColor;
};

const connectorPath = ref<GraphicsInst>();

const renderFn = (
  graphics: GraphicsInst,
  points: BezierPoints,
  strokeWidth = $shapes.connectorWidth,
  isHoverArea = false,
) => {
  const color = getConnectorColor(isHoverArea);

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
      width: isHoverArea ? 5 : strokeWidth,
      color,
      alpha: isHoverArea ? 0 : 1,
    });
};

useAnimatePixiContainer({
  targetDisplayObject: connectorPath,
  changeTracker: computed(() => isHovered.value),
  initialValue: $shapes.connectorWidth,
  targetValue: $shapes.selectedConnectorWidth,
  animationParams: { duration: 0.1, ease: "easeIn" },
  onUpdate: (value) => {
    if (!isSelected.value) {
      renderFn(
        connectorPath.value!,
        getBezier(...startEndWithMoveDeltas.value),
        value,
      );
    }
  },
  animateOut: true,
});

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
    props.destNode === floatingConnector.value.context.parentNodeId &&
    props.destPort === floatingConnector.value.context.portInstance.index &&
    floatingConnector.value.context.origin === "in"
  ) {
    return true;
  }

  return false;
});

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

const isMultiselect = (event: FederatedPointerEvent) =>
  event.shiftKey || event[getMetaOrCtrlKey()];

const onConnectionClick = (event: FederatedPointerEvent) => {
  if (!isMultiselect(event)) {
    selectionStore.deselectAllObjects();
  }

  const action = isConnectionSelected.value(props.id)
    ? selectionStore.deselectConnection
    : selectionStore.selectConnection;

  action(props.id);
};
</script>

<template>
  <Graphics
    event-mode="static"
    :renderable="renderable"
    :visible="renderable"
    :label="`ConnectorHoverArea__${id}`"
    cursor="pointer"
    @render="
      renderFn(
        $event,
        getBezier(...startEndWithMoveDeltas),
        $shapes.selectedConnectorWidth,
        true,
      )
    "
    @pointerdown.stop.prevent="onConnectionClick"
    @pointerenter="isHovered = true"
    @pointerleave="isHovered = false"
  />

  <Graphics
    ref="connectorPath"
    :renderable="renderable"
    :visible="renderable"
    :label="`Connector__${id}`"
    @render="
      renderFn(
        $event,
        getBezier(...startEndWithMoveDeltas),
        isSelected ? $shapes.selectedConnectorWidth : $shapes.connectorWidth,
      )
    "
  />
</template>
