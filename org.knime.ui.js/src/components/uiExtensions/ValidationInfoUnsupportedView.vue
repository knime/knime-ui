<script setup lang="ts">
import { computed } from "vue";

import type { KnimeNode } from "@/api/custom-types";
import { getNodeState } from "@/util/nodeUtil";

import LegacyPortViewButtons from "./LegacyPortViewButtons.vue";
import type { ValidationError } from "./common/types";

type Props = {
  selectedNode: KnimeNode | null;
  selectedPortIndex: number | null;
  validationError: ValidationError;
  canOpenLegacyPortViews: boolean;
  canExecute: boolean;
};

const props = defineProps<Props>();

const emit = defineEmits<{
  openLegacyPortView: [execute: boolean];
}>();

const isPortExecuted = computed(() => {
  if (props.selectedPortIndex === null || !props.selectedNode) {
    return false;
  }

  const state = getNodeState(props.selectedNode, props.selectedPortIndex);

  return state === "EXECUTED";
});

const openLegacyPortView = (executeNode: boolean) => {
  emit("openLegacyPortView", executeNode);
};
</script>

<template>
  <template v-if="!canOpenLegacyPortViews">
    This port view is not supported in the browser. Please download the KNIME
    Analytics Platform to see the content in the desktop application
  </template>

  <span v-else>{{ validationError.message }}</span>

  <LegacyPortViewButtons
    v-if="canOpenLegacyPortViews"
    :can-execute="canExecute"
    :is-executed="isPortExecuted"
    @open-legacy-port-view="openLegacyPortView"
  />
</template>
