<!-- eslint-disable no-undefined -->
<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
import { Rectangle } from "pixi.js";

import { animFrame } from "../../util/animFrame";

import {
  NativeNodeInvariants,
  Node,
  NodeState,
} from "@/api/gateway-api/generated-api";
import { useTooltip } from "@/components/workflowEditor/WebGLKanvas/tooltip/useTooltip";
import type { TooltipDefinition } from "@/components/workflowEditor/types";
import * as $colors from "@/style/colors";
import * as $shapes from "@/style/shapes";
import type { ContainerInst, GraphicsInst } from "@/vue3-pixi";

type Props = NodeState & {
  loopStatus?: string;
  textResolution?: number;
  /** Used to derive the category border color matching the card border */
  type?: NativeNodeInvariants.TypeEnum | null;
  kind?: Node.KindEnum;
  /** Card width used to center the traffic light; defaults to nodeCardWidth */
  cardWidth?: number;
};

const props = withDefaults(defineProps<Props>(), {
  executionState: undefined,
  progress: undefined,
  progressMessages: () => [],
  error: undefined,
  warning: undefined,
  issue: undefined,
  resolutions: () => [],
  loopStatus: undefined,
  textResolution: undefined,
  type: undefined,
  kind: undefined,
  cardWidth: undefined,
});

const categoryColor = computed(() => {
  if (props.type && Reflect.has($colors.nodeBackgroundColors, props.type)) {
    return $colors.nodeBackgroundColors[
      props.type as keyof typeof $colors.nodeBackgroundColors
    ];
  }
  if (props.kind === Node.KindEnum.Component) {
    return $colors.nodeBackgroundColors.Component;
  }
  return "#aaa";
});

const isExecuting = computed(
  () =>
    props.executionState === NodeState.ExecutionStateEnum.EXECUTING ||
    props.executionState === NodeState.ExecutionStateEnum.QUEUED,
);

// [redActive, yellowActive, greenActive] or undefined while executing
const trafficLight = computed<[boolean, boolean, boolean] | undefined>(() => {
  if (isExecuting.value) return undefined;
  if (props.error) return [true, false, false];
  if (props.warning) return [false, true, false];
  switch (props.executionState) {
    case NodeState.ExecutionStateEnum.IDLE:
      return [true, false, false];
    case NodeState.ExecutionStateEnum.CONFIGURED:
      return [false, true, false];
    case NodeState.ExecutionStateEnum.EXECUTED:
    case NodeState.ExecutionStateEnum.HALTED:
      return [false, false, true];
    default:
      return [false, false, false];
  }
});

const stateX = computed(
  () => (props.cardWidth ?? $shapes.nodeCardWidth) / 2,
);

const tooltip = computed<TooltipDefinition | null>(() => {
  let tooltip = {
    position: {
      x: stateX.value,
      y: 0,
    },
    gap: 1,
    hoverable: true,
    orientation: "bottom" as const,
    text: "",

    issue: props.issue ?? undefined,
    resolutions: props.resolutions,
  } satisfies TooltipDefinition;

  if (props.error) {
    return { ...tooltip, text: props.error, type: "error" };
  } else if (props.warning) {
    return { ...tooltip, text: props.warning, type: "warning" };
  } else if (props.progressMessages.length) {
    return { ...tooltip, text: props.progressMessages.join(" – ") };
  }

  return null;
});

const tooltipRef = useTemplateRef<ContainerInst>("tooltipRef");
const { showTooltip, hideTooltip } = useTooltip({
  tooltip,
  element: tooltipRef,
});

// Hit area centered at (0,0) — covers the traffic light pill
const hitArea = new Rectangle(-13, -6, 26, 12);

// Traffic light pill dimensions
const PILL_W = 20;
const PILL_H = 8;
const PILL_RADIUS = 4;
// 3 dot positions relative to pill center
const DOT_X = [-6, 0, 6] as const;
const DOT_RADIUS = 2;
const ACTIVE_FILL = [
  $colors.trafficLight.red,
  $colors.trafficLight.yellow,
  $colors.trafficLight.green,
] as const;
const ACTIVE_STROKE = [
  $colors.trafficLight.redBorder,
  $colors.trafficLight.yellowBorder,
  $colors.trafficLight.greenBorder,
] as const;

// Expose for tests
defineExpose({ trafficLight });

const renderTrafficLight = (graphics: GraphicsInst) => {
  // Always subscribe to animFrame so any state change triggers a redraw.
  // The executing animation also needs per-frame alpha updates.
  const _frame = animFrame.value;
  graphics.clear();

  if (trafficLight.value === undefined) {
    // Executing/queued: animated pulsing blue dot
    const alpha = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(performance.now() / 400));
    graphics.circle(0, 0, DOT_RADIUS);
    graphics.fill({ color: $colors.nodeProgressBar, alpha });
    return;
  }

  // Background pill — white fill with category-color border matching the card
  graphics.roundRect(-PILL_W / 2, -PILL_H / 2, PILL_W, PILL_H, PILL_RADIUS);
  graphics.fill("white");
  graphics.stroke({ width: 1, color: categoryColor.value });

  // Draw only the single active dot (idle=left, configured=center, executed=right)
  const activeIdx = trafficLight.value.indexOf(true);
  if (activeIdx !== -1) {
    graphics.circle(DOT_X[activeIdx], 0, DOT_RADIUS);
    graphics.fill(ACTIVE_FILL[activeIdx]);
    graphics.stroke({ width: 1, color: ACTIVE_STROKE[activeIdx] });
  }
};
</script>

<template>
  <Container
    ref="tooltipRef"
    label="NodeState"
    :hit-area="hitArea"
    event-mode="static"
    :x="stateX"
    :y="0"
    @pointerenter="showTooltip"
    @pointerleave="hideTooltip"
  >
    <Graphics
      label="NodeStateTrafficLight"
      event-mode="none"
      @render="renderTrafficLight"
    />
  </Container>
</template>
