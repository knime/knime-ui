<script setup lang="ts">
import { computed, watch } from "vue";
import { API } from "@api";

import type { AvailablePortTypes, KnimeNode } from "@/api/custom-types";
import { toExtendedPortObject } from "@/util/portDataMapper";
import {
  buildMiddleware,
  validateNodeConfigurationState,
  validateNodeNotBusy,
  validateOutputPorts,
  validatePortSelection,
  validatePortSupport,
} from "../common/output-validator";
import type { UIExtensionLoadingState, ValidationError } from "../common/types";

import PortViewLoader from "./PortViewLoader.vue";
import PortViewTabToggles from "./PortViewTabToggles.vue";

/**
 * Runs a set of validations that qualify whether a port from a node is able
 * to show its view
 * @returns object containing an `error` property. If not null then it means the port is invalid. Additionally
 * more details about the error can be read from the `error` object
 */
const runValidationChecks = ({
  selectedNode,
  portTypes,
  selectedPortIndex,
}: {
  /** the node that is currently selected */
  selectedNode: KnimeNode;
  /** dictionary of Port Types. Can be used to get more information on the port based on its typeId property */
  portTypes: AvailablePortTypes;
  /** index of the selected port */
  selectedPortIndex: number;
}) => {
  const validationMiddleware = buildMiddleware(
    validateOutputPorts,
    validatePortSelection,
    validatePortSupport,
    validateNodeConfigurationState,
    validateNodeNotBusy,
  );

  const result = validationMiddleware({
    selectedNode,
    portTypes,
    selectedPortIndex,
  })();

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
  versionId?: string;
  selectedNode: KnimeNode;
  selectedPortIndex: number;
  availablePortTypes: AvailablePortTypes;
};

const props = defineProps<Props>();

const emit = defineEmits<{
  loadingStateChange: [value: UIExtensionLoadingState];
  validationError: [value: ValidationError | null];
  executeNode: [];
}>();

const uniquePortKey = computed(() => {
  // using UNIQUE keys for all possible ports in knime-ui ensures that a new port view instance
  // is created upon switching ports
  // port object version changes whenever a port state has updated.
  // "ABA"-Changes on the port will always trigger a re-render.

  const { portContentVersion } =
    props.selectedNode.outPorts[props.selectedPortIndex];

  return [
    props.projectId,
    props.workflowId,
    props.selectedNode.id,
    props.selectedPortIndex,
    portContentVersion,
  ].join("/");
});

const validationError = computed(() => {
  const validationResult = runValidationChecks({
    selectedNode: props.selectedNode,
    portTypes: props.availablePortTypes,
    selectedPortIndex: props.selectedPortIndex,
  });

  return validationResult?.error ?? null;
});

const selectedPort = computed(() => {
  if (validationError.value) {
    return null;
  }

  return props.selectedNode.outPorts[props.selectedPortIndex];
});

const portViews = computed(() => {
  if (!selectedPort.value) {
    return null;
  }

  const fullPortObject = toExtendedPortObject(props.availablePortTypes)(
    selectedPort.value.typeId,
  );

  return fullPortObject.views;
});

watch(
  validationError,
  () => {
    emit("validationError", validationError.value ?? null);
  },
  { immediate: true },
);

const openViewInNewWindow = (viewIndex: number) => {
  API.desktop.openPortView({
    projectId: props.projectId,
    nodeId: props.selectedNode.id,
    viewIndex,
    portIndex: props.selectedPortIndex,
  });
};
</script>

<template>
  <PortViewTabToggles
    v-if="!validationError && portViews"
    :selected-node="selectedNode"
    :selected-port-index="selectedPortIndex"
    :unique-port-key="uniquePortKey"
    :view-descriptors="portViews.descriptors"
    :view-descriptor-mapping="portViews.descriptorMapping"
    @open-view-in-new-window="openViewInNewWindow"
  >
    <template #default="{ activeView }">
      <PortViewLoader
        v-if="!validationError && activeView !== null"
        :unique-port-key="`${uniquePortKey}/${activeView}`"
        :project-id="projectId"
        :workflow-id="workflowId"
        :version-id="versionId"
        :selected-node="selectedNode"
        :selected-port-index="selectedPortIndex"
        :selected-view-index="activeView"
        @loading-state-change="$emit('loadingStateChange', $event)"
      />
    </template>
  </PortViewTabToggles>
</template>
