<!-- eslint-disable no-undefined -->
<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
import { Graphics, Point, Polygon } from "pixi.js";

import { NodeState } from "@/api/gateway-api/generated-api";
import { useTooltip } from "@/components/workflowEditor/common/useTooltip";
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
 * sets the different lights of the traffic light
 * @returns {[boolean, boolean, boolean] | undefined}
 * @example [true, false, false] means [red: on, yellow: off, green: off]
 * @example 'undefined' means no traffic light should be shown
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

const fillColors = computed(() => {
  if (!trafficLight.value) {
    return undefined;
  }

  const colorNames = ["red", "yellow", "green"] as const;

  return trafficLight.value.map((value, i) => {
    const name = colorNames[i];
    return value ? $colors.trafficLight[name] : $colors.trafficLight.inactive;
  });
});

const strokeColors = computed(() => {
  if (!trafficLight.value) {
    return undefined;
  }

  const strokeColorNames = [
    "redBorder",
    "yellowBorder",
    "greenBorder",
  ] as const;

  return trafficLight.value.map((value, i) => {
    const name = strokeColorNames[i];
    return value
      ? $colors.trafficLight[name]
      : $colors.trafficLight.inactiveBorder;
  });
});

const tooltip = computed<TooltipDefinition | null>(() => {
  const { nodeSize } = $shapes;
  let tooltip = {
    position: {
      x: nodeSize / 2,
      y: 0,
    },
    anchorPoint: undefined,
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
useTooltip({ tooltip, element: tooltipRef });

const issuesIconWidth = 13;
const issuesIconHeight = 10;
const hitArea = new Polygon([
  new Point(0, 0),
  new Point($shapes.nodeSize, 0),
  new Point($shapes.nodeSize, $shapes.nodeStatusHeight),
  new Point(
    $shapes.nodeSize / 2 + issuesIconWidth / 2,
    $shapes.nodeStatusHeight,
  ),
  new Point(
    $shapes.nodeSize / 2 + issuesIconWidth / 2,
    $shapes.nodeStatusHeight + issuesIconHeight / 2,
  ),
  new Point(
    $shapes.nodeSize / 2 - issuesIconWidth / 2,
    $shapes.nodeStatusHeight + issuesIconHeight / 2,
  ),
  new Point(
    $shapes.nodeSize / 2 - issuesIconWidth / 2,
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
    :y="$shapes.nodeSize + $shapes.nodeStatusMarginTop"
  >
    <Graphics
      event-mode="none"
      @render="
        (graphics: GraphicsInst) => {
          graphics.clear();
          graphics.roundRect(
            0,
            0,
            $shapes.nodeSize,
            $shapes.nodeStatusHeight,
            1,
          );
          graphics.fill($colors.trafficLight.background);
          graphics.stroke({ width: 0.3, color: $colors.darkeningMask });
        }
      "
    />

    <template v-if="trafficLight">
      <template v-for="(_, index) of trafficLight" :key="index">
        <Graphics
          event-mode="none"
          label="TrafficLightBorder"
          @render="
            (graphics: GraphicsInst) => {
              graphics.clear();
              graphics.circle(6 + 10 * index, 6, 4);
              graphics.fill(fillColors![index]);
            }
          "
        />

        <Graphics
          event-mode="none"
          label="TrafficLightCircle"
          @render="
            (graphics: GraphicsInst) => {
              graphics.clear();
              graphics.circle(6 + 10 * index, 6, 3.5);
              graphics.stroke({ width: 1, color: strokeColors![index] });
            }
          "
        />
      </template>
    </template>

    <Text
      v-else-if="executionState === 'QUEUED'"
      event-mode="none"
      :x="$shapes.nodeSize / 2"
      :anchor="{ x: 0.5, y: 0 }"
      :style="nodeStateText.styles"
      :resolution="textResolution"
    >
      {{ loopStatus && loopStatus === "PAUSED" ? "paused" : "queued" }}
    </Text>

    <template v-else-if="executionState === 'EXECUTING'">
      <NodeStateProgress
        event-mode="none"
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
