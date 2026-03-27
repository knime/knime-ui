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

/**
 * sets the different lights of the traffic light
 * @returns {[boolean, boolean, boolean] | undefined}
 * @example [true, false, false] means [red: on, yellow: off, green: off]
 * @example 'undefined' means no traffic light should be shown
 */
const trafficLight = computed(() => {
  const defaultValue = [false, false, false];
  const stateMapper: Partial<
    Record<NodeState.ExecutionStateEnum, [boolean, boolean, boolean]>
  > = {
    IDLE: [true, false, false],
    CONFIGURED: [false, true, false],
    EXECUTED: [false, false, true],
    HALTED: [false, false, true], // TODO NXT-279: for now halted is the same state as executed
  };

  if (props.executionState && props.executionState in stateMapper) {
    return stateMapper[props.executionState];
  }

  return props.executionState === null ? defaultValue : null;
});

const clippedProgress = computed(() =>
  Math.min(Math.max(props.progress!, 0), 1),
);

const progressBarWidth = computed(() => {
  let result = $shapes.nodeSize * clippedProgress.value;
  if (result && result < 1) {
    // fractional pixels just don't look good
    return 1;
  }
  return result;
});

const percentageClipPath = computed(() => {
  return `polygon(0 0, ${100 * clippedProgress.value}% 0, ${
    100 * clippedProgress.value
  }% 100%, 0 100%)`;
});

const progressDisplayPercentage = computed(() => {
  // Use `floor` instead of `round` so that 100% isn't reached too early
  return Math.floor(100 * clippedProgress.value);
});

const tooltip = computed<TooltipDefinition | null>(() => {
  const { nodeSize, nodeStatusHeight, nodeStatusMarginTop } = $shapes;
  let tooltip = {
    position: {
      x: nodeSize / 2,
      y: nodeSize + nodeStatusMarginTop + nodeStatusHeight,
    },
    anchorPoint: anchorPoint ?? { x: 0, y: 0 },
    gap: 10,
    hoverable: true,
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

const DOT_CX = [11, 16, 21] as const;
const DOT_FILL = (["red", "yellow", "green"] as const).map(
  (k) => $colors.trafficLight[k],
);
const DOT_STROKE = (["redBorder", "yellowBorder", "greenBorder"] as const).map(
  (k) => $colors.trafficLight[k],
);

useTooltip({ tooltip, element: useTemplateRef<SVGGElement>("tooltipRef") });
</script>

<template>
  <g ref="tooltipRef">
    <rect
      width="16"
      :height="$shapes.nodeStatusHeight"
      :x="($shapes.nodeSize - 16) / 2"
      fill="#e6e6e6"
      stroke="var(--kds-color-border-muted)"
      stroke-width="1"
      rx="3"
    />

    <!-- node's static states: only the single active dot -->
    <g v-if="trafficLight">
      <template v-for="(active, index) of trafficLight" :key="index">
        <circle
          v-if="active"
          :cx="DOT_CX[index]"
          cy="3"
          r="2"
          :fill="DOT_FILL[index]"
          :stroke="DOT_STROKE[index]"
          stroke-width="1"
        />
      </template>
    </g>
    <text
      v-else-if="executionState === 'QUEUED'"
      class="progress-text"
      :x="$shapes.nodeSize / 2"
      :fill="$colors.text.default"
      text-anchor="middle"
      y="4.5"
    >
      {{ loopStatus && loopStatus === "PAUSED" ? "paused" : "queued" }}
    </text>

    <!-- node's animated execution state -->
    <template v-else-if="executionState === 'EXECUTING'">
      <circle
        v-if="!progress"
        class="progress-circle"
        r="2"
        :cy="$shapes.nodeStatusHeight / 2"
        :fill="$colors.nodeProgressBar"
      />

      <!-- progress bar with text -->
      <template v-else>
        <text
          class="progress-text progress-bar"
          :fill="$colors.text.default"
          :x="$shapes.nodeSize / 2"
          text-anchor="middle"
          y="4.5"
        >
          {{ progressDisplayPercentage }}%
        </text>
        <rect
          :height="$shapes.nodeStatusHeight"
          :width="progressBarWidth"
          :fill="$colors.nodeProgressBar"
          rx="1"
        />
        <g :clip-path="percentageClipPath">
          <!-- spacer for clip-path  -->
          <rect
            :height="$shapes.nodeStatusHeight"
            :width="$shapes.nodeSize"
            fill="none"
          />
          <text
            class="progress-text"
            :x="$shapes.nodeSize / 2"
            y="4.5"
            fill="white"
            text-anchor="middle"
          >
            {{ progressDisplayPercentage }}%
          </text>
        </g>
      </template>
    </template>

    <!-- errors & warnings -->
    <g
      v-if="error"
      class="error"
      :transform="`translate(${$shapes.nodeSize / 2}, ${
        $shapes.nodeStatusHeight
      })`"
    >
      <circle r="5" :fill="$colors.error" />
      <line x1="-2.25" y1="-2.25" x2="2.25" y2="2.25" stroke="white" />
      <line x1="2.25" y1="-2.25" x2="-2.25" y2="2.25" stroke="white" />
    </g>
    <g
      v-else-if="warning"
      class="warning"
      :transform="`translate(${$shapes.nodeSize / 2 - 6}, 5.5)`"
    >
      <path
        d="M6,1.25 L0.5,10.75 H11.5 Z"
        :fill="$colors.warning"
        :stroke="$colors.Masala"
        stroke-linejoin="round"
      />
      <line x1="6" x2="6" :stroke="$colors.Masala" y1="4.2" y2="7.3" />
      <circle r="0.5" cy="8.75" cx="6" :fill="$colors.Masala" />
    </g>
  </g>
</template>

<style lang="postcss" scoped>
.progress-text {
  font-size: 8px;
  line-height: 9px;
}

@keyframes executing {
  from {
    cx: 6px; /* circle radius */
  }

  to {
    cx: 26px; /* node width - circle radius */
  }
}

.progress-circle {
  animation-name: executing;
  animation-duration: 0.8s;
  animation-direction: alternate;
  animation-iteration-count: infinite;
  animation-timing-function: cubic-bezier(0.5, 0, 0.5, 1);
}
</style>
