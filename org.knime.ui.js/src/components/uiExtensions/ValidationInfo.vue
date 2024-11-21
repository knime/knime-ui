<script setup lang="ts">
import { computed } from "vue";

import type { KnimeNode } from "@/api/custom-types";
import { useStore } from "@/composables/useStore";
import * as nodeUtils from "@/util/nodeUtil";
import { toExtendedPortObject } from "@/util/portDataMapper";

import ExecuteButton from "./ExecuteButton.vue";
import LegacyPortViewButtons from "./LegacyPortViewButtons.vue";
import LoadingIndicator from "./LoadingIndicator.vue";
import type { ValidationError } from "./common/types";

type Props = {
  selectedNode: KnimeNode | null;
  selectedPortIndex: number | null;
  validationError: ValidationError | null;
};

const props = defineProps<Props>();

const store = useStore();
const uiControls = computed(() => store.state.uiControls);

const availablePortTypes = computed(
  () => store.state.application.availablePortTypes,
);

const isUnsupportedView = computed(
  () => props.validationError?.code === "UNSUPPORTED_PORT_VIEW",
);
const isNodeBusy = computed(() => props.validationError?.code === "NODE_BUSY");

const fullPortObject = computed(() => {
  try {
    if (!props.selectedNode || props.selectedPortIndex === null) {
      return null;
    }

    const selectedPort = props.selectedNode.outPorts[props.selectedPortIndex];

    return toExtendedPortObject(availablePortTypes.value)(selectedPort.typeId);
  } catch (error) {
    return null;
  }
});

const isView = computed(() => {
  if (!props.selectedNode) {
    return false;
  }

  if (!nodeUtils.isNativeNode(props.selectedNode)) {
    return false;
  }

  return Boolean(props.selectedNode.hasView);
});

const executeButtonMessage = computed(() => {
  const messageTemplate = (kind: string) =>
    `To show the ${kind}, please execute the selected node.`;

  return messageTemplate(isView.value ? "view" : "port output");
});

const canExecute = computed(() => {
  if (!uiControls.value.canEditWorkflow || !props.selectedNode) {
    return false;
  }

  if (nodeUtils.isNodeMetaNode(props.selectedNode)) {
    return Boolean(
      props.selectedPortIndex !== null &&
        nodeUtils.canExecute(props.selectedNode, props.selectedPortIndex),
    );
  }

  if (props.selectedPortIndex !== null) {
    const isFlowVariable = fullPortObject.value?.kind === "flowVariable";

    return (
      !isFlowVariable &&
      nodeUtils.canExecute(props.selectedNode, props.selectedPortIndex)
    );
  }

  // port index does not matter here
  return nodeUtils.canExecute(props.selectedNode, 0);
});

const isPortExecuted = computed(() => {
  if (props.selectedPortIndex === null || !props.selectedNode) {
    return false;
  }

  const state = nodeUtils.getNodeState(
    props.selectedNode,
    props.selectedPortIndex,
  );

  return state === "EXECUTED";
});

const onExecuteNode = async () => {
  if (props.selectedNode) {
    const canContinue = await store.dispatch(
      "nodeConfiguration/autoApplySettings",
      { nextNodeId: props.selectedNode.id },
    );

    if (!canContinue) {
      return;
    }

    store.dispatch("workflow/executeNodes", [props.selectedNode.id]);
  }
};

const openLegacyPortView = (executeNode: boolean) => {
  if (props.selectedNode && props.selectedPortIndex) {
    store.dispatch("workflow/openLegacyPortView", {
      nodeId: props.selectedNode.id,
      portIndex: props.selectedPortIndex,
      executeNode,
    });
  }
};
</script>

<template>
  <div v-if="validationError" class="info-wrapper">
    <template v-if="isUnsupportedView">
      <template v-if="!uiControls.canOpenLegacyPortViews">
        This port view is not supported in the browser. Please download the
        KNIME Analytics Platform to see the content in the desktop application
      </template>

      <span v-else>{{ validationError.message }}</span>

      <LegacyPortViewButtons
        v-if="isUnsupportedView && uiControls.canOpenLegacyPortViews"
        :can-execute="canExecute"
        :is-executed="isPortExecuted"
        @open-legacy-port-view="openLegacyPortView"
      />
    </template>

    <template v-if="!isUnsupportedView && !canExecute">
      <LoadingIndicator v-if="isNodeBusy" :message="validationError.message" />

      <span v-else>{{ validationError.message }}</span>
    </template>
  </div>

  <ExecuteButton
    v-if="canExecute && !isUnsupportedView"
    :message="executeButtonMessage"
    @click="onExecuteNode"
  />
</template>

<style lang="postcss" scoped>
.info-wrapper {
  display: flex;
  justify-content: center;
  flex-direction: column;
  align-items: center;
  height: 100%;
}
</style>
