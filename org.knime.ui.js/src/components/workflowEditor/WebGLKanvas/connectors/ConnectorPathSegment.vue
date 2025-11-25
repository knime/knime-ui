<!-- eslint-disable no-undefined -->
<script setup lang="ts">
import { computed, toRefs, useTemplateRef, watch } from "vue";
import { type AnimationPlaybackControls, animate } from "motion";
import type { ColorSource, FederatedPointerEvent, LineCap } from "pixi.js";

import type { XY } from "@/api/gateway-api/generated-api";
import * as $colors from "@/style/colors";
import * as $shapes from "@/style/shapes";
import { geometry } from "@/util/geometry";
import { DashLine } from "@/util/pixiDashedLine";
import type { GraphicsInst } from "@/vue3-pixi";
import type { ConnectorPathSegmentProps } from "../../types";
import { type BezierPoints, getBezier } from "../../util/connectorPath";
import { useAnimatePixiContainer } from "../common/useAnimatePixiContainer";

import ConnectorBendpoint from "./ConnectorBendpoint.vue";

const HOVER_AREA_SIZE = 5;

type Props = ConnectorPathSegmentProps & {
  isSegmentHovered: boolean;
  isDebugModeEnabled?: boolean;
  isFloatingConnector?: boolean;
};

defineOptions({ inheritAttrs: false });

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
  addVirtualBendpoint: [{ position: XY; event: FederatedPointerEvent }];
  hoverVirtualBendpoint: [value: boolean];
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

const centerPoint = computed(() =>
  geometry.utils.getCenterPoint(props.segment.start, props.segment.end),
);

const color = computed(() => {
  if (props.isDraggedOver) {
    return $colors.MeadowDark;
  }

  if (props.isSelected) {
    return $colors.Cornflower;
  }

  if (props.isFlowvariableConnection) {
    return $colors.Coral;
  }

  const connectorColor = props.isHighlighted
    ? $colors.Masala
    : $colors.StoneGray;

  return props.isFloatingConnector && props.isDebugModeEnabled
    ? "blue"
    : connectorColor;
});

// Due to the way Pixi treats strokes we must adjust the size
// of the bezier curves so that they get capped on the ends instead
// of creating an extra "padding" that affects the interactible/hoverable area
const getStrokeBasedBezierOffsets = (strokeWidth: number) => {
  return {
    offsetStart: strokeWidth / 2,
    // only apply it for the last segment, so as not to leave gaps on bendpoints
    offsetEnd: props.isLastSegment ? -((strokeWidth + 1) / 2) : 0,
  };
};

const renderHoverArea = (graphics: GraphicsInst) => {
  const { offsetStart, offsetEnd } =
    getStrokeBasedBezierOffsets(HOVER_AREA_SIZE);

  graphics
    .clear()
    .moveTo(bezier.value.start.x + offsetStart, bezier.value.start.y)
    .bezierCurveTo(
      bezier.value.control1.x,
      bezier.value.control1.y,
      bezier.value.control2.x,
      bezier.value.control2.y,
      bezier.value.end.x + offsetEnd,
      bezier.value.end.y,
    )
    .stroke({
      width: HOVER_AREA_SIZE,
      color: isDebugModeEnabled.value ? $colors.MeadowLight : $colors.White,
      alpha: isDebugModeEnabled.value ? 1 : 0,
      cap: "square",
    });
};

const strokeWidth = computed(() => {
  if (props.isHighlighted) {
    return $shapes.highlightedConnectorWidth;
  }

  if (props.isSelected || props.isDraggedOver) {
    return $shapes.selectedConnectorWidth;
  }

  return $shapes.connectorWidth;
});

const pathSegment = useTemplateRef<GraphicsInst>("pathSegment");

let animatedStrokeWidth = $shapes.connectorWidth;
let animatedDashOffset = 0;
const dashLength = 5;

const renderConnector = (graphics: GraphicsInst, points: BezierPoints) => {
  const dashOffset = props.streaming ? animatedDashOffset : 0;
  const connectorWidth = props.isConnectionHovered
    ? animatedStrokeWidth
    : strokeWidth.value;
  const { offsetStart, offsetEnd } =
    getStrokeBasedBezierOffsets(connectorWidth);
  const smoothness = 0.9;

  graphics.clear();

  const stroke = {
    width: connectorWidth,
    color: color.value as ColorSource,
    cap: "square" as LineCap,
  };

  let graphicsOrDashed: GraphicsInst | DashLine = graphics;

  if (props.streaming) {
    graphicsOrDashed = new DashLine(graphics, {
      dash: [dashLength, dashLength],
      dashOffset,
      ...stroke,
    });
  }

  graphicsOrDashed
    .moveTo(points.start.x + offsetStart, points.start.y)
    .bezierCurveTo(
      points.control1.x,
      points.control1.y,
      points.control2.x,
      points.control2.y,
      points.end.x + offsetEnd,
      points.end.y,
      smoothness,
    );

  graphics.stroke(stroke);
};

/** hover animation */
useAnimatePixiContainer({
  targetDisplayObject: pathSegment,
  changeTracker: computed(() => props.isConnectionHovered),
  initialValue: $shapes.connectorWidth,
  targetValue: $shapes.selectedConnectorWidth,
  animationParams: { duration: 0.1, ease: "easeIn" },
  onUpdate: (value) => {
    if (!props.isSelected && !props.suggestDelete) {
      animatedStrokeWidth = value;
      renderConnector(pathSegment.value!, bezier.value);
    }
  },
  animateOut: true,
});

/** streaming animation */
/* eslint-disable no-magic-numbers */
useAnimatePixiContainer({
  targetDisplayObject: pathSegment,
  changeTracker: computed(() => props.streaming),
  initialValue: dashLength * 2 * 10, // move 10 dashes per 3 seconds
  targetValue: 0,
  animationParams: { duration: 3, ease: "linear", repeat: Infinity },
  onUpdate: (value) => {
    animatedDashOffset = value;
    renderConnector(pathSegment.value!, bezier.value);
  },
  animateOut: false,
  immediate: props.streaming,
});
/* eslint-enable no-magic-numbers */

const suggestShiftX = -12;
const suggestShiftY = -6;
let replacementAnimation: AnimationPlaybackControls | undefined;
watch(suggestDelete, (shouldAnimate) => {
  const normalBezier = structuredClone(bezier.value);

  const animatedBezier = getBezier(
    props.segment.start.x,
    props.segment.start.y,
    props.segment.end.x + suggestShiftX,
    props.segment.end.y + suggestShiftY,
  );

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

          renderConnector(pathSegment.value!, normalBezier);
        },
      },
    );
  } else {
    replacementAnimation?.stop();
    replacementAnimation = undefined;
    renderConnector(pathSegment.value!, normalBezier);
  }
});
</script>

<template>
  <Container label="ConnectorPathSegment">
    <Graphics
      :label="`ConnectorPathSegmentHoverArea__${connectionId}`"
      v-bind="$attrs"
      :event-mode="interactive ? 'static' : 'none'"
      cursor="pointer"
      :dataset="{ connectionId }"
      @render="renderHoverArea"
    />

    <Graphics
      ref="pathSegment"
      label="ConnectorPathSegmentRender"
      event-mode="none"
      @render="renderConnector($event, bezier)"
    />

    <ConnectorBendpoint
      v-if="!isReadonly"
      :connection-id="connectionId"
      :is-visible="isSegmentHovered"
      :is-flow-variable-connection="false"
      :is-selected="false"
      :is-dragging="false"
      :index="-1"
      :position="centerPoint"
      virtual
      :is-debug-mode-enabled="isDebugModeEnabled"
      @pointerdown.left="
        emit('addVirtualBendpoint', { position: centerPoint, event: $event })
      "
      @pointerenter="emit('hoverVirtualBendpoint', true)"
      @pointerleave="emit('hoverVirtualBendpoint', false)"
    />
  </Container>
</template>
