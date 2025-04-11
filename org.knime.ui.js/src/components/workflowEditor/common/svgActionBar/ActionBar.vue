<script lang="ts" setup>
import { computed } from "vue";

import * as $shapes from "@/style/shapes";
import type { ActionButtonConfig } from "../../types";

import ActionButton from "./ActionButton.vue";
/**
 * SVG based action bar
 */

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
    return null;
  }

  if (typeof title === "string") {
    return title;
  }

  if (typeof title === "function") {
    return title(action);
  }

  return null;
};
</script>

<template>
  <g>
    <ActionButton
      v-for="(action, index) in actions"
      :key="index"
      :x="positions[index]"
      :primary="action.primary"
      :disabled="action.disabled"
      :title="getTitle(action)"
      @click="action.onClick"
    >
      <Component :is="action.icon" />
    </ActionButton>
  </g>
</template>
