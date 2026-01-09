<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { debounce } from "lodash-es";
import { storeToRefs } from "pinia";

import type { KnimeNode } from "@/api/custom-types";
import { ports } from "@/lib/data-mappers";
import { workflowDomain } from "@/lib/workflow-domain";
import { useApplicationStore } from "@/store/application/application";
import { useNodeConfigurationStore } from "@/store/nodeConfiguration/nodeConfiguration";
import { useUIControlsStore } from "@/store/uiControls/uiControls";
import { useExecutionStore } from "@/store/workflow/execution";

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

const uiControls = useUIControlsStore();
const { availablePortTypes } = storeToRefs(useApplicationStore());

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

    return ports.toExtendedPortObject(availablePortTypes.value)(
      selectedPort.typeId,
    );
  } catch (_error) {
    return null;
  }
});

const isView = computed(() => {
  if (!props.selectedNode) {
    return false;
  }

  if (!workflowDomain.node.isNative(props.selectedNode)) {
    return workflowDomain.node.isComponent(props.selectedNode);
  }

  return Boolean(props.selectedNode.hasView);
});

const executeButtonMessage = computed(() => {
  const messageTemplate = (kind: string) =>
    `To show the ${kind}, execute the selected node.`;

  return messageTemplate(isView.value ? "view" : "port output");
});

const canExecute = computed(() => {
  if (!uiControls.canEditWorkflow || !props.selectedNode) {
    return false;
  }

  if (workflowDomain.node.isMetaNode(props.selectedNode)) {
    return Boolean(
      props.selectedPortIndex !== null &&
        workflowDomain.node.canExecute(
          props.selectedNode,
          props.selectedPortIndex,
        ),
    );
  }

  if (props.selectedPortIndex !== null) {
    const isFlowVariable = fullPortObject.value?.kind === "flowVariable";

    return (
      !isFlowVariable &&
      workflowDomain.node.canExecute(
        props.selectedNode,
        props.selectedPortIndex,
      )
    );
  }

  // port index does not matter here
  return workflowDomain.node.canExecute(props.selectedNode, 0);
});

const canExecuteDebounced = ref(false);

watch(
  canExecute,
  debounce((newVal) => {
    canExecuteDebounced.value = newVal;
  }, 100),
  { immediate: true },
);

const isPortExecuted = computed(() => {
  if (props.selectedPortIndex === null || !props.selectedNode) {
    return false;
  }

  const state = workflowDomain.node.getExecutionState(
    props.selectedNode,
    props.selectedPortIndex,
  );

  return state === "EXECUTED";
});

const nodeConfigurationStore = useNodeConfigurationStore();
const executionStore = useExecutionStore();

const onExecuteNode = async () => {
  if (props.selectedNode) {
    const canContinue = await nodeConfigurationStore.autoApplySettings();

    if (!canContinue) {
      return;
    }

    await executionStore.executeNodes([props.selectedNode.id]);
  }
};

const openLegacyPortView = (executeNode: boolean) => {
  if (props.selectedNode && props.selectedPortIndex) {
    executionStore.openLegacyPortView({
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
        This port view is not supported in the browser. Download KNIME Analytics
        Platform to view the content in the desktop application.
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
    v-if="canExecuteDebounced && !isUnsupportedView"
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
