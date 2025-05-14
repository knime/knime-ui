<!-- eslint-disable no-undefined -->
<script lang="ts" setup>
import { computed } from "vue";
import type { GraphicsContext } from "pixi.js";

import type { ActionButtonConfig } from "@/components/workflowEditor/types";
import * as $shapes from "@/style/shapes";

import ActionButton from "./ActionButton.vue";

type Props = {
  actions: Array<ActionButtonConfig>;
};

const props = defineProps<Props>();

/**
 *  returns the x-position of each button depending on the total amount of buttons
 *  @returns {Array<Number>} x-pos
 */
const positions = computed(() => {
  const { nodeActionBarButtonSpread } = $shapes;
  let buttonCount = props.actions.length;
  // spread buttons evenly around the horizontal center
  return props.actions.map(
    (_, i) => (i + (1 - buttonCount) / 2) * nodeActionBarButtonSpread,
  );
});

const getTitle = (action: ActionButtonConfig) => {
  const { title } = action;
  if (!title) {
    return undefined;
  }

  if (typeof title === "string") {
    return title;
  }

  if (typeof title === "function") {
    return title(action);
  }

  return undefined;
};
</script>

<template>
  <Container label="ActionBar">
    <ActionButton
      v-for="(action, index) in actions"
      :key="index"
      :x="positions[index] ?? 0"
      :primary="action.primary"
      :disabled="action.disabled"
      :title="getTitle(action)"
      :icon="action.icon as GraphicsContext"
      :test-id="action.testId"
      :on-click="action.onClick"
    />
  </Container>
</template>
