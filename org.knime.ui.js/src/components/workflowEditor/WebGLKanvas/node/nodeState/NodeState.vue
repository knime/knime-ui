<!-- eslint-disable no-undefined -->
<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
import { Rectangle } from "pixi.js";

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

const dotColor = computed(() => {
  if (props.error) return $colors.trafficLight.red;
  if (props.warning) return $colors.trafficLight.yellow;
  switch (props.executionState) {
    case NodeState.ExecutionStateEnum.Idle:
      return $colors.trafficLight.red;
    case NodeState.ExecutionStateEnum.Configured:
      return $colors.trafficLight.yellow;
    case NodeState.ExecutionStateEnum.Executed:
    case NodeState.ExecutionStateEnum.Halted:
      return $colors.trafficLight.green;
    case NodeState.ExecutionStateEnum.Executing:
    case NodeState.ExecutionStateEnum.Queued:
      return $colors.nodeProgressBar;
    default:
      return $colors.trafficLight.inactive;
  }
});

const tooltip = computed<TooltipDefinition | null>(() => {
  let tooltip = {
    position: {
      x: $shapes.nodeCardWidth / 2,
      y: 15,
    },
    gap: 1,
    hoverable: true,
    orientation: "bottom" as const,
    text: "",
    // eslint-disable-next-line no-undefined
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

// Small hit area around the dot (local coords centered at 0,0)
const hitArea = new Rectangle(-10, -10, 20, 20);

const renderDot = (graphics: GraphicsInst) => {
  graphics.clear();
  // White backing ring
  graphics.circle(0, 0, 6);
  graphics.fill("white");
  // Status dot
  graphics.circle(0, 0, 5);
  graphics.fill(dotColor.value);
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
      label="NodeStateDot"
      event-mode="none"
      @render="renderDot"
    />
  </Container>
</template>
