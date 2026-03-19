<script setup lang="ts">
import { computed, inject, useTemplateRef } from "vue";

import type { NodeState, XY } from "@/api/gateway-api/generated-api";
import { useTooltip } from "@/components/workflowEditor/SVGKanvas/tooltip/useTooltip";
import * as $colors from "@/style/colors";
import * as $shapes from "@/style/shapes";
import type { TooltipDefinition } from "../../types";

const anchorPoint = inject<XY>("anchorPoint");

type Props = {
  executionState?: NodeState.ExecutionStateEnum | null;
  progress?: number | null;
  progressMessages?: [];
  error?: string | null;
  warning?: string | null;
  issue?: string | null;
  resolutions?: [];
  // TODO: NXT-845 validator and/or docs needed
  // TODO: NXT-845 naming state vs status
  loopStatus?: string | null;
};

const props = withDefaults(defineProps<Props>(), {
  executionState: null,
  progress: null,
  progressMessages: () => [],
  error: null,
  warning: null,
  issue: null,
  resolutions: () => [],
  loopStatus: null,
});

const dotColor = computed(() => {
  if (props.error) return $colors.trafficLight.red;
  if (props.warning) return $colors.trafficLight.yellow;
  switch (props.executionState) {
    case "IDLE":
      return $colors.trafficLight.red;
    case "CONFIGURED":
      return $colors.trafficLight.yellow;
    case "EXECUTED":
    case "HALTED":
      return $colors.trafficLight.green;
    case "EXECUTING":
    case "QUEUED":
      return $colors.nodeProgressBar;
    default:
      return $colors.trafficLight.inactive;
  }
});

const isAnimating = computed(
  () =>
    props.executionState === "EXECUTING" || props.executionState === "QUEUED",
);

const tooltip = computed<TooltipDefinition | null>(() => {
  const base = {
    position: {
      x: $shapes.nodeCardWidth / 2,
      y: 15,
    },
    anchorPoint: anchorPoint ?? { x: 0, y: 0 },
    gap: 10,
    hoverable: true,
    text: "",
    // eslint-disable-next-line no-undefined
    issue: props.issue ?? undefined,
    resolutions: props.resolutions,
  } satisfies TooltipDefinition;

  if (props.error) {
    return { ...base, text: props.error, type: "error" };
  } else if (props.warning) {
    return { ...base, text: props.warning, type: "warning" };
  } else if (props.progressMessages.length) {
    return { ...base, text: props.progressMessages.join(" – ") };
  }

  return null;
});

useTooltip({ tooltip, element: useTemplateRef<SVGGElement>("tooltipRef") });
</script>

<template>
  <g ref="tooltipRef">
    <!-- White backing ring to lift dot off card edge -->
    <circle r="6" fill="white" />
    <!-- Status dot -->
    <circle r="5" :fill="dotColor" />
    <!-- Pulsing ring for executing/queued state -->
    <circle
      v-if="isAnimating"
      class="pulse-ring"
      r="5"
      fill="none"
      stroke-width="1.5"
      :stroke="dotColor"
    />
  </g>
</template>

<style lang="postcss" scoped>
@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }

  100% {
    transform: scale(2.2);
    opacity: 0;
  }
}

.pulse-ring {
  transform-origin: center;
  animation: pulse 1.2s ease-out infinite;
}
</style>
