<script lang="ts" setup>
import { computed } from "vue";
import type { GraphicsContext } from "pixi.js";

import type { Action } from "@/components/workflowEditor/common/types";
import * as $shapes from "@/style/shapes";

import ActionButton from "./ActionButton.vue";

type Props = {
  actions: Array<Action>;
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

const getTitle = (action: Action) => {
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
  <Container>
    <ActionButton
      v-for="(action, index) in actions"
      :key="index"
      :x="positions[index] ?? 0"
      :primary="action.primary"
      :disabled="action.disabled"
      :title="getTitle(action)"
      :icon="action.icon as GraphicsContext"
      @click="action.onClick"
    />
  </Container>
</template>
