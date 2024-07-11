<script setup lang="ts">
import { computed, watch } from "vue";

import type { Alert } from "@knime/ui-extension-service";
import OpenInNewWindowIcon from "@knime/styles/img/icons/open-in-new-window.svg";
import { Button } from "@knime/components";

import type { NativeNode } from "@/api/gateway-api/generated-api";
import type { AvailablePortTypes } from "@/api/custom-types";
import { useStore } from "@/composables/useStore";
import { compatibility } from "@/environment";

import type { UIExtensionLoadingState, ValidationError } from "../common/types";

import {
  buildMiddleware,
  validateNodeConfigurationState,
  validateNodeExecuted,
  validateNodeNotBusy,
} from "../common/output-validator";

import NodeViewLoader from "./NodeViewLoader.vue";

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

const store = useStore();

const emit = defineEmits<{
  loadingStateChange: [value: UIExtensionLoadingState];
  validationError: [value: ValidationError | null];
  alert: [value: Alert | null];
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

const openInNewWindow = () => {
  store.dispatch("workflow/executeNodeAndOpenView", props.selectedNode.id);
};
</script>

<template>
  <div
    v-if="!nodeErrors && compatibility.canDetachNodeViews()"
    class="detach-button-wrapper"
  >
    <Button
      with-border
      class="detach-view"
      title="Open node view in new window"
      @click="openInNewWindow()"
    >
      <OpenInNewWindowIcon />
      <span>Open in new window</span>
    </Button>
  </div>

  <div v-if="!nodeErrors" class="node-view-wrapper">
    <NodeViewLoader
      :project-id="projectId"
      :workflow-id="workflowId"
      :selected-node="selectedNode"
      @loading-state-change="emit('loadingStateChange', $event)"
      @alert="emit('alert', $event)"
    />
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.node-view-wrapper {
  height: 100%;
}

.detach-button-wrapper {
  display: flex;
  width: max-content;
  height: min-content;
  position: absolute;
  inset: 10px 0 0;
  margin: 0 auto;
  z-index: 3;

  & .detach-view {
    height: 20px;
    padding: 0 10px 0 5px;
    font-size: 13px;
    line-height: 0.1;
    border-color: var(--knime-silver-sand);

    & svg {
      margin-left: 5px;

      @mixin svg-icon-size 12;
    }
  }
}
</style>
