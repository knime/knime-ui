<script setup lang="ts">
import { computed, watch } from "vue";
import type { NativeNode } from "@/api/gateway-api/generated-api";
import type { AvailablePortTypes } from "@/api/custom-types";

import NodeViewLoader from "./NodeViewLoader.vue";
import type { UIExtensionLoadingState, ValidationError } from "../common/types";

import {
  buildMiddleware,
  validateNodeConfigurationState,
  validateNodeExecuted,
  validateNodeNotBusy,
} from "../common/output-validator";

/**
 * Runs a set of validations that qualify whether a node from a given group is able
 * to show its view
 * @returns object containing an `error` property. If not null then it means the node is invalid. Additionally
 * more details about the error can be read from that `error` object
 */
const runNodeValidationChecks = ({
  selectedNode,
  portTypes,
}: {
  selectedNode: NativeNode;
  portTypes: AvailablePortTypes;
}) => {
  const validationMiddleware = buildMiddleware(
    validateNodeConfigurationState,
    validateNodeNotBusy,
    validateNodeExecuted,
  );

  const result = validationMiddleware({ selectedNode, portTypes })();

  return Object.freeze(result);
};

/**
 * Validates and renders the PortViewLoader. It ensures the conditions are right for the PortView to be loaded
 * via several validation constraints. It yields back information about said validations as well as information
 * about the loading state of the PortView
 */

type Props = {
  projectId: string;
  workflowId: string;
  selectedNode: NativeNode;
  availablePortTypes: AvailablePortTypes;
};

const props = defineProps<Props>();

const emit = defineEmits<{
  loadingStateChange: [value: UIExtensionLoadingState];
  validationError: [value: ValidationError | null];
}>();

const nodeErrors = computed(() => {
  const result = runNodeValidationChecks({
    selectedNode: props.selectedNode,
    portTypes: props.availablePortTypes,
  });

  return result?.error ?? null;
});

watch(
  nodeErrors,
  () => {
    emit("validationError", nodeErrors.value ?? null);
  },
  { immediate: true },
);
</script>

<template>
  <NodeViewLoader
    v-if="!nodeErrors"
    :project-id="projectId"
    :workflow-id="workflowId"
    :selected-node="selectedNode"
    @loading-state-change="$emit('loadingStateChange', $event)"
  />
</template>
