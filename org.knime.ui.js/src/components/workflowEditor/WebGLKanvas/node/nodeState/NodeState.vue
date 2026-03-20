<!-- eslint-disable no-undefined -->
<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
import { Rectangle } from "pixi.js";

import { animFrame } from "../../util/animFrame";

import { NodeState } from "@/api/gateway-api/generated-api";
import { useTooltip } from "@/components/workflowEditor/WebGLKanvas/tooltip/useTooltip";
import type { TooltipDefinition } from "@/components/workflowEditor/types";
import * as $colors from "@/style/colors";
import * as $shapes from "@/style/shapes";
import type { ContainerInst, GraphicsInst } from "@/vue3-pixi";

type Props = NodeState & {
  loopStatus?: string;
  textResolution?: number;
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

const tooltip = computed<TooltipDefinition | null>(() => {
  let tooltip = {
    position: {
      x: $shapes.nodeCardWidth / 2,
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
const hitArea = new Rectangle(-20, -7, 40, 14);

// Traffic light pill dimensions
const PILL_W = 34;
const PILL_H = 10;
const PILL_RADIUS = 5;
// 3 dot positions relative to pill center
const DOT_X = [-10, 0, 10] as const;
const DOT_RADIUS = 3.5;
const ACTIVE_FILL = ["#C81D31", "#FFDD5A", "#71BD5B"] as const;
const ACTIVE_STROKE = ["#670317", "#9F4B24", "#276023"] as const;
const INACTIVE_FILL = "#BBBBBB";
const INACTIVE_STROKE = "#888888";

// Expose for tests
defineExpose({ trafficLight });

const renderTrafficLight = (graphics: GraphicsInst) => {
  // Subscribe to animFrame only while executing
  const _frame = isExecuting.value ? animFrame.value : 0;
  graphics.clear();

  if (trafficLight.value === undefined) {
    // Executing/queued: animated pulsing blue dot
    const alpha = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(performance.now() / 400));
    graphics.circle(0, 0, DOT_RADIUS + 1);
    graphics.fill({ color: $colors.nodeProgressBar, alpha });
    return;
  }

  // Background pill
  graphics.roundRect(-PILL_W / 2, -PILL_H / 2, PILL_W, PILL_H, PILL_RADIUS);
  graphics.fill($colors.trafficLight.background);

  // 3 dots: red (left), yellow (center), green (right)
  for (let i = 0; i < 3; i++) {
    graphics.circle(DOT_X[i], 0, DOT_RADIUS);
    if (trafficLight.value[i]) {
      graphics.fill(ACTIVE_FILL[i]);
      graphics.stroke({ width: 1, color: ACTIVE_STROKE[i] });
    } else {
      graphics.fill(INACTIVE_FILL);
      graphics.stroke({ width: 0.5, color: INACTIVE_STROKE });
    }
  }
};
</script>

<template>
  <Container
    ref="tooltipRef"
    label="NodeState"
    :hit-area="hitArea"
    event-mode="static"
    :x="$shapes.nodeCardWidth / 2"
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
