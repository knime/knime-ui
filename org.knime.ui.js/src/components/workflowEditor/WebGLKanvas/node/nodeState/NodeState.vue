<!-- eslint-disable no-undefined -->
<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
import { Graphics, Point, Polygon } from "pixi.js";

import { NodeState } from "@/api/gateway-api/generated-api";
import { useTooltip } from "@/components/workflowEditor/WebGLKanvas/tooltip/useTooltip";
import type { TooltipDefinition } from "@/components/workflowEditor/types";
import * as $colors from "@/style/colors";
import * as $shapes from "@/style/shapes";
import type { ContainerInst, GraphicsInst } from "@/vue3-pixi";
import { nodeStateText } from "../../util/textStyles";

import NodeStateIssues from "./NodeStateIssues.vue";
import NodeStateProgress from "./NodeStateProgress.vue";

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

/**
 * Maps execution state to which traffic-light position is active.
 * [red, yellow, green] – we reuse this to derive a single dot color.
 */
const trafficLight = computed<[boolean, boolean, boolean] | undefined>(() => {
  const defaultValue: [boolean, boolean, boolean] = [false, false, false];
  const stateMapper: Partial<
    Record<NodeState.ExecutionStateEnum, [boolean, boolean, boolean]>
  > = {
    IDLE: [true, false, false],
    CONFIGURED: [false, true, false],
    EXECUTED: [false, false, true],
    HALTED: [false, false, true], // TODO NXT-279: for now halted is the same state as executed
  };

  if (props.executionState && props.executionState in stateMapper) {
    return stateMapper[props.executionState]!;
  }

  return props.executionState === undefined ? defaultValue : undefined;
});

/** Single dot color derived from the active traffic-light position. */
const dotColor = computed(() => {
  if (!trafficLight.value) {
    return undefined;
  }
  const colorNames = [
    $colors.trafficLight.red,
    $colors.trafficLight.yellow,
    $colors.trafficLight.green,
  ] as const;
  const activeIndex = trafficLight.value.findIndex((v) => v);
  return activeIndex >= 0
    ? colorNames[activeIndex]
    : $colors.trafficLight.inactive;
});

const tooltip = computed<TooltipDefinition | null>(() => {
  const { nodePillWidth } = $shapes;
  let tooltip = {
    position: {
      x: nodePillWidth / 2,
      y: 0,
    },
    gap: 1,
    hoverable: true,
    orientation: "bottom",
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

const issuesIconWidth = 13;
const issuesIconHeight = 10;
const hitArea = new Polygon([
  new Point(0, 0),
  new Point($shapes.nodePillWidth, 0),
  new Point($shapes.nodePillWidth, $shapes.nodeStatusHeight),
  new Point(
    $shapes.nodePillWidth / 2 + issuesIconWidth / 2,
    $shapes.nodeStatusHeight,
  ),
  new Point(
    $shapes.nodePillWidth / 2 + issuesIconWidth / 2,
    $shapes.nodeStatusHeight + issuesIconHeight / 2,
  ),
  new Point(
    $shapes.nodePillWidth / 2 - issuesIconWidth / 2,
    $shapes.nodeStatusHeight + issuesIconHeight / 2,
  ),
  new Point(
    $shapes.nodePillWidth / 2 - issuesIconWidth / 2,
    $shapes.nodeStatusHeight,
  ),
  new Point(0, $shapes.nodeStatusHeight),
]);
</script>

<template>
  <Container
    ref="tooltipRef"
    label="NodeState"
    :hit-area="hitArea"
    event-mode="static"
    :y="$shapes.nodePillHeight - $shapes.nodeStatusHeight"
    @pointerenter="showTooltip"
    @pointerleave="hideTooltip"
  >
    <template v-if="dotColor !== undefined">
      <Graphics
        event-mode="none"
        label="StateDot"
        @render="
          (graphics: GraphicsInst) => {
            graphics.clear();
            graphics.circle(6, $shapes.nodeStatusHeight / 2, 4);
            graphics.fill(dotColor!);
          }
        "
      />
    </template>

    <Text
      v-else-if="executionState === 'QUEUED'"
      label="NodeStateText"
      event-mode="none"
      :x="$shapes.nodePillWidth / 2"
      :anchor="{ x: 0.5, y: 0 }"
      :style="nodeStateText.styles"
      :resolution="textResolution"
    >
      {{ loopStatus && loopStatus === "PAUSED" ? "paused" : "queued" }}
    </Text>

    <template v-else-if="executionState === 'EXECUTING'">
      <NodeStateProgress
        :progress="progress"
        :execution-state="executionState"
        :text-resolution="textResolution"
      />
    </template>

    <NodeStateIssues
      v-if="error || warning"
      event-mode="none"
      :error="error"
      :warning="warning"
    />
  </Container>
</template>