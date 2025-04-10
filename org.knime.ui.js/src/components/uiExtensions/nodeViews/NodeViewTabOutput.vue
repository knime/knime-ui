<script setup lang="ts">
import { computed, watch } from "vue";

import { Button } from "@knime/components";
import OpenInNewWindowIcon from "@knime/styles/img/icons/open-in-new-window.svg";
import type { Alert } from "@knime/ui-extension-renderer/api";

import type { AvailablePortTypes } from "@/api/custom-types";
import type { NativeNode } from "@/api/gateway-api/generated-api";
import { useUIControlsStore } from "@/store/uiControls/uiControls";
import { useExecutionStore } from "@/store/workflow/execution";
import {
  buildMiddleware,
  validateNodeConfigurationState,
  validateNodeExecuted,
  validateNodeNotBusy,
} from "../common/output-validator";
import type { UIExtensionLoadingState, ValidationError } from "../common/types";

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
  versionId?: string;
  selectedNode: NativeNode;
  timestamp: number;
  availablePortTypes: AvailablePortTypes;
};

const props = defineProps<Props>();

const uiControls = useUIControlsStore();

const emit = defineEmits<{
  loadingStateChange: [value: UIExtensionLoadingState];
  validationError: [value: ValidationError | null];
  alert: [{ alert: Alert; nodeName?: string } | null];
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
  useExecutionStore().executeNodeAndOpenView(props.selectedNode.id);
};
</script>

<template>
  <div
    v-if="!nodeErrors && uiControls.canDetachNodeViews"
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
      :version-id="versionId"
      :selected-node="selectedNode"
      :timestamp="timestamp"
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
  z-index: v-bind("$zIndices.layerStaticPanelDecorations");

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
