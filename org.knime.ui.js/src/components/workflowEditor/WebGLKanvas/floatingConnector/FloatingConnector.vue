<!-- eslint-disable no-undefined -->
<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import type { NodeRelation } from "@/api/custom-types";
import { useFloatingConnectorStore } from "@/store/floatingConnector/floatingConnector";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { isNodeMetaNode } from "@/util/nodeUtil";
import Connector from "../connectors/Connector.vue";
import Port from "../ports/Port.vue";

import FloatingConnectorDecoration from "./FloatingConnectorDecoration.vue";

const { floatingConnector, isInsideSnapRegion, snapTarget } = storeToRefs(
  useFloatingConnectorStore(),
);
const { getNodeById } = storeToRefs(useNodeInteractionsStore());

const floatingConnectorPort = computed(() => {
  if (!floatingConnector.value) {
    // eslint-disable-next-line no-undefined
    return undefined;
  }

  return floatingConnector.value.context.portInstance;
});

const referenceNode = computed(() => {
  if (!floatingConnector.value) {
    return undefined;
  }

  return getNodeById.value(floatingConnector.value.context.parentNodeId);
});

const isDefaultFlowVariableConnection = computed(() => {
  return (
    floatingConnector.value &&
    floatingConnector.value.flowVariableConnection &&
    floatingConnectorPort.value?.index === 0 &&
    referenceNode.value &&
    !isNodeMetaNode(referenceNode.value)
  );
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
  <Container
    v-if="floatingConnector && floatingConnectorPort"
    label="FloatingfloatingConnector"
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
      :position="floatingConnector.context.portPosition"
      :pivot="{ x: -$shapes.portSize / 2, y: -$shapes.portSize / 2 }"
      event-mode="none"
    >
      <Port :port="floatingConnectorPort" />
    </Container>

    <Container :position="floatingConnector.absolutePoint" event-mode="none">
      <Port :port="floatingConnectorPort" :targeted="Boolean(snapTarget)" />
    </Container>

    <FloatingConnectorDecoration
      v-if="!isInsideSnapRegion"
      :position="floatingConnector.absolutePoint"
      :node-relation="nodeRelation"
    />
  </Container>
</template>
