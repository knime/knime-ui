<script setup lang="ts">
import { computed } from "vue";

import type { KnimeNode } from "@/api/custom-types";
import { compatibility } from "@/environment";
import * as nodeUtils from "@/util/nodeUtil";

import type { ValidationError } from "./common/types";
import LegacyPortViewButtons from "./LegacyPortViewButtons.vue";
import ExecuteButtons from "./ExecuteButtons.vue";
import { useStore } from "@/composables/useStore";
import { toExtendedPortObject } from "@/util/portDataMapper";

type Props = {
  selectedNode: KnimeNode | null;
  selectedPortIndex: number | null;
  validationError: ValidationError | null;
};

const props = defineProps<Props>();

const store = useStore();

const permissions = computed(() => store.state.application.permissions);
const availablePortTypes = computed(
  () => store.state.application.availablePortTypes,
);

const isUnsupportedView = computed(
  () => props.validationError?.code === "NO_SUPPORTED_VIEW",
);

const canExecute = computed(() => {
  if (!permissions.value.canEditWorkflow) {
    return false;
  }

  if (!props.selectedNode) {
    return false;
  }

  if (nodeUtils.isNodeMetaNode(props.selectedNode)) {
    return Boolean(
      props.selectedPortIndex &&
        nodeUtils.canExecute(props.selectedNode, props.selectedPortIndex),
    );
  }

  if (props.selectedPortIndex !== null) {
    const selectedPort = props.selectedNode.outPorts[props.selectedPortIndex];
    const fullPortObject = toExtendedPortObject(availablePortTypes.value)(
      selectedPort.typeId,
    );

    const isFlowVariable = fullPortObject.kind === "flowVariable";

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

const onExecuteNode = () => {
  if (props.selectedNode) {
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
    <template v-if="!canExecute">
      <template
        v-if="isUnsupportedView && !compatibility.canOpenLegacyPortViews()"
      >
        This port view is not supported in the browser. Please download the
        KNIME Analytics Platform to see the content in the desktop application
      </template>

      <template v-else>
        {{ validationError.message }}
      </template>
    </template>

    <LegacyPortViewButtons
      v-if="isUnsupportedView && compatibility.canOpenLegacyPortViews()"
      :can-execute="canExecute"
      :is-executed="isPortExecuted"
      @open-legacy-view="openLegacyPortView"
    />
  </div>

  <ExecuteButtons
    v-if="canExecute"
    :validation-error="validationError"
    :selected-node="selectedNode"
    :selected-port-index="selectedPortIndex"
    @execute-node="onExecuteNode"
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
