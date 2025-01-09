<script setup lang="ts">
import { computed } from "vue";

import type { NodePort } from "@/api/gateway-api/generated-api";
import DeleteIcon from "@/assets/delete.svg";
import ActionButton from "@/components/common/ActionButton.vue";
import Port from "@/components/common/Port.vue";
import { useEscapeStack } from "@/composables/useEscapeStack";
import * as $shapes from "@/style/shapes";

type Props = {
  port: NodePort;
  direction: "in" | "out";
  relativePosition?: [number, number];
  anchorPoint: { x: number; y: number };
};

const props = withDefaults(defineProps<Props>(), {
  relativePosition: () => [0, 0],
});

const emit = defineEmits<{
  close: [];
  "action:remove": [];
}>();

useEscapeStack({
  onEscape() {
    emit("close");
  },
});

const actions = computed(() => [
  {
    id: "remove",
    title: "Remove port",
    isDisabled: !props.port.canRemove,
    eventName: "action:remove" as const,
  },
]);

const selectedPortPosition = computed(() => {
  const [x, y] = props.relativePosition;
  console.log("actions", actions.value)
  return [props.anchorPoint.x + x, props.anchorPoint.y + y];
});

const hoverArea = computed(() => {
  const totalActions = actions.value.length;

  // reverse the rect
  const xOffset =
    props.direction === "in" ? $shapes.portActionButtonSize * totalActions : 0;

  return {
    x: -($shapes.portActionButtonSize / 2) - xOffset,
    y: -($shapes.portActionButtonSize / 2),

    // calculates the hover area based on the total actions
    // adds 1 to account for the space the highlighted port itself takes up
    width: $shapes.portActionButtonSize * (totalActions + 1),
    height: $shapes.portActionButtonSize,
  };
});

const buttonX = (actionIndex: number) => {
  const delta = props.direction === "in" ? -1 : 1;
  return (
    ($shapes.portActionButtonSize + $shapes.portActionsGapSize) *
    actionIndex *
    delta
  );
};
</script>

<template>
  <g :transform="`translate(${selectedPortPosition})`">
    <!--
        Capture mouse events on the rect to prevent them from being sent to the node
        while the port actions are visible
     -->
    <rect
      v-bind="hoverArea"
      fill="transparent"
      @mouseenter.stop
      @mouseleave.stop
      @click.stop
    />

    <!-- 'fake' selected port -->
    <Port :port="port" class="selected-port" is-selected />

    <ActionButton
      v-for="(action, index) in actions"
      :id="action.id"
      :key="action.id"
      :x="buttonX(index + 1)"
      :disabled="action.isDisabled"
      :title="action.title"
      @click="emit(action.eventName)"
    >
      <DeleteIcon />
    </ActionButton>
  </g>
</template>
