<!-- eslint-disable no-undefined -->
<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import type { NodeRelation } from "@/api/custom-types";
import { useFloatingConnectorStore } from "@/store/floatingConnector/floatingConnector";
import {
  isDecoratorOnly,
  isFullFloatingConnector,
} from "@/store/floatingConnector/types";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import * as $shapes from "@/style/shapes";
import { isNodeMetaNode } from "@/util/nodeUtil";
import { ports } from "@/util/workflow-canvas";
import Connector from "../connectors/Connector.vue";
import Port from "../ports/Port.vue";

import FloatingConnectorDecoration from "./FloatingConnectorDecoration.vue";

const { floatingConnector, isInsideSnapRegion, snapTarget } = storeToRefs(
  useFloatingConnectorStore(),
);

const { getNodeById } = useNodeInteractionsStore();

const floatingConnectorPort = computed(() => {
  if (!floatingConnector.value || isDecoratorOnly(floatingConnector.value)) {
    // eslint-disable-next-line no-undefined
    return undefined;
  }

  return floatingConnector.value.context.portInstance;
});

const referenceNode = computed(() => {
  if (!floatingConnector.value || isDecoratorOnly(floatingConnector.value)) {
    return undefined;
  }

  return getNodeById(floatingConnector.value.context.parentNodeId);
});

const isDefaultFlowVariableConnection = computed(() => {
  return (
    floatingConnector.value &&
    isFullFloatingConnector(floatingConnector.value) &&
    floatingConnector.value.flowVariableConnection &&
    floatingConnectorPort.value?.index === 0 &&
    referenceNode.value &&
    !isNodeMetaNode(referenceNode.value)
  );
});

const defaultFlowVariablePortPosition = computed(() => {
  if (!isDefaultFlowVariableConnection.value) {
    return undefined;
  }

  // this does not rely on portPositions of the context as they might be not there for
  // non-drag connectors (e.g. quick add with CTRL+Space)
  const flowVariablePosition = ports
    .positions({
      portCount: 1,
      isOutports: floatingConnector.value!.context.origin === "out",
    })
    .at(0)!;

  return {
    x:
      referenceNode.value!.position.x +
      flowVariablePosition[0] -
      $shapes.portSize / 2,
    y:
      referenceNode.value!.position.y +
      flowVariablePosition[1] -
      $shapes.portSize / 2,
  };
});

const nodeRelation = computed<NodeRelation | undefined>(() => {
  if (!floatingConnector.value) {
    return undefined;
  }

  return floatingConnector.value.context.origin === "in"
    ? "PREDECESSORS"
    : "SUCCESSORS";
});
</script>

<template>
  <Container v-if="floatingConnector" label="FloatingConnector">
    <Container
      v-if="floatingConnectorPort && isFullFloatingConnector(floatingConnector)"
    >
      <Connector
        :id="floatingConnector.id"
        :absolute-point="floatingConnector.absolutePoint"
        :source-node="floatingConnector.sourceNode"
        :dest-node="floatingConnector.destNode"
        :source-port="floatingConnector.sourcePort"
        :dest-port="floatingConnector.destPort"
        :interactive="floatingConnector.interactive"
        :flow-variable-connection="floatingConnector.flowVariableConnection"
        :allowed-actions="floatingConnector.allowedActions"
      />

      <Container
        v-if="isDefaultFlowVariableConnection"
        label="DefaultFlowVariablePlaceholder"
        :position="defaultFlowVariablePortPosition"
        :pivot="{ x: -$shapes.portSize / 2, y: -$shapes.portSize / 2 }"
        event-mode="none"
      >
        <Port event-mode="none" :port="floatingConnectorPort" />
      </Container>

      <Container
        label="DraggedPort"
        :position="floatingConnector.absolutePoint"
        event-mode="none"
      >
        <Port :port="floatingConnectorPort" :targeted="Boolean(snapTarget)" />
      </Container>
    </Container>
    <FloatingConnectorDecoration
      v-if="!isInsideSnapRegion"
      :position="floatingConnector.absolutePoint"
      :node-relation="nodeRelation"
    />
  </Container>
</template>
