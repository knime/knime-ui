<!-- eslint-disable no-undefined -->
<script setup lang="ts">
import { computed, toRefs, useTemplateRef, watch } from "vue";
import { type AnimationPlaybackControls, animate } from "motion";
import type { FederatedPointerEvent } from "pixi.js";

import type { XY } from "@/api/gateway-api/generated-api";
import * as $colors from "@/style/colors";
import * as $shapes from "@/style/shapes";
import type { GraphicsInst } from "@/vue3-pixi";
import { type BezierPoints, getBezier } from "../../util/connectorPath";
import { useAnimatePixiContainer } from "../common/useAnimatePixiContainer";

import type { PathSegment } from "./types";

const HOVER_AREA_SIZE = 5;

type Props = {
  connectionId: string;
  segment: PathSegment;
  isFlowvariableConnection: boolean;
  isHighlighted: boolean;
  isDraggedOver: boolean;
  suggestDelete: boolean;
  isConnectionHovered: boolean;
  index: number;
  isLastSegment: boolean;
  isReadonly?: boolean;
  isSelected?: boolean;
  interactive?: boolean;
  streaming?: boolean;
  isDebugModeEnabled?: boolean;
  isFloatingConnector?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  interactive: true,
  isReadonly: false,
  isSelected: false,
  streaming: false,
  isDebugModeEnabled: false,
  isFloatingConnector: false,
});

const { isDebugModeEnabled, suggestDelete } = toRefs(props);

const emit = defineEmits<{
  pointerdown: [event: FederatedPointerEvent];
  hovered: [value: boolean];
  addVirtualBendpoint: [{ position: XY; event: FederatedPointerEvent }];
}>();

const bezier = computed(() => {
  const x1 = props.segment.start.x;
  const y1 = props.segment.start.y;
  const x2 = props.segment.end.x;
  const y2 = props.segment.end.y;

  const shouldOffsetStart = props.index !== 0;
  const shouldOffsetEnd = !props.isLastSegment;

  return getBezier(x1, y1, x2, y2, shouldOffsetStart, shouldOffsetEnd);
});

const color = computed(() => {
  if (props.isSelected) {
    return $colors.Cornflower;
  }

  if (props.isHighlighted) {
    return $colors.Masala;
  }

  const connectorColor = props.isFlowvariableConnection
    ? $colors.Coral
    : $colors.StoneGray;

  return props.isFloatingConnector && props.isDebugModeEnabled
    ? "blue"
    : connectorColor;
});

const renderHoverArea = (graphics: GraphicsInst) => {
  graphics
    .clear()
    .moveTo(bezier.value.start.x, bezier.value.start.y)
    .bezierCurveTo(
      bezier.value.control1.x,
      bezier.value.control1.y,
      bezier.value.control2.x,
      bezier.value.control2.y,
      bezier.value.end.x,
      bezier.value.end.y,
    )
    .stroke({
      width: HOVER_AREA_SIZE,
      color: isDebugModeEnabled.value ? $colors.MeadowLight : "white",
      alpha: isDebugModeEnabled.value ? 1 : 0,
    });
};

const renderConnector = (
  graphics: GraphicsInst,
  points: BezierPoints,
  strokeWidth = $shapes.connectorWidth,
) => {
  graphics
    .clear()
    .moveTo(points.start.x, points.start.y)
    .bezierCurveTo(
      points.control1.x,
      points.control1.y,
      points.control2.x,
      points.control2.y,
      points.end.x,
      points.end.y,
    )
    .stroke({
      width: strokeWidth,
      color: color.value,
    });
};

const pathSegment = useTemplateRef<GraphicsInst>("pathSegment");

useAnimatePixiContainer({
  targetDisplayObject: pathSegment,
  changeTracker: computed(() => props.isConnectionHovered),
  initialValue: $shapes.connectorWidth,
  targetValue: $shapes.selectedConnectorWidth,
  animationParams: { duration: 0.1, ease: "easeIn" },
  onUpdate: (value) => {
    if (!props.isSelected && !props.suggestDelete) {
      renderConnector(pathSegment.value!, bezier.value, value);
    }
  },
  animateOut: true,
});

// TODO: maybe do w/o animating
useAnimatePixiContainer({
  targetDisplayObject: pathSegment,
  changeTracker: computed(() => props.isHighlighted),
  initialValue: $shapes.connectorWidth,
  targetValue: $shapes.highlightedConnectorWidth,
  animationParams: { duration: 0.1, ease: "easeIn" },
  onUpdate: (value) => {
    if (!props.isSelected) {
      renderConnector(pathSegment.value!, bezier.value, value);
    }
  },
});

const suggestShiftX = -12;
const suggestShiftY = -6;
let replacementAnimation: AnimationPlaybackControls | undefined;
watch(suggestDelete, (shouldAnimate) => {
  const normalBezier = structuredClone(bezier.value);

  const animatedBezier = getBezier(
    normalBezier.start.x,
    normalBezier.start.y,
    normalBezier.end.x + suggestShiftX,
    normalBezier.end.x + suggestShiftY,
  );

  const currentWidth = props.isSelected
    ? $shapes.selectedConnectorWidth
    : $shapes.connectorWidth;

  if (shouldAnimate) {
    replacementAnimation = animate(
      normalBezier.end,
      { x: animatedBezier.end.x, y: animatedBezier.end.y },
      {
        duration: 0.2,
        ease: "easeOut",
        onUpdate: () => {
          if (replacementAnimation && !pathSegment.value) {
            replacementAnimation.stop();
            return;
          }

          renderConnector(pathSegment.value!, normalBezier, currentWidth);
        },
      },
    );
  } else {
    replacementAnimation?.stop();
    replacementAnimation = undefined;
    renderConnector(pathSegment.value!, normalBezier, currentWidth);
  }
});
</script>

<template>
  <Container>
    <Graphics
      :event-mode="interactive ? 'static' : 'none'"
      label="HoverArea"
      cursor="pointer"
      @render="renderHoverArea"
      @pointerdown.stop.prevent="emit('pointerdown', $event)"
      @pointerenter="emit('hovered', true)"
      @pointerleave="emit('hovered', false)"
    />

    <Graphics
      ref="pathSegment"
      label="PathSegment"
      @render="
        renderConnector(
          $event,
          bezier,
          isSelected ? $shapes.selectedConnectorWidth : $shapes.connectorWidth,
        )
      "
    />
  </Container>
</template>
