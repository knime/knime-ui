<script setup lang="ts">
import { onMounted, useTemplateRef } from "vue";
import { storeToRefs } from "pinia";
import { RenderLayer } from "pixi.js";

import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import type { ContainerInst } from "@/vue3-pixi";

import SelectionRectangle from "./SelectionRectangle/SelectionRectangle.vue";
import Connector from "./connectors/Connector.vue";
import FloatingConnector from "./floatingConnector/FloatingConnector.vue";
import Node from "./node/Node.vue";

const { activeWorkflow } = storeToRefs(useWorkflowStore());
const { getNodeIcon, getNodeName, getNodeType } = storeToRefs(
  useNodeInteractionsStore(),
);

const canvasStore = useWebGLCanvasStore();
const { canvasLayers } = storeToRefs(canvasStore);

const selectedNodesLayerContainer = useTemplateRef<ContainerInst>(
  "selectedNodesLayerContainer",
);

onMounted(() => {
  // add a layer for nodes that are selected, so that they get displayed
  // above other nodes
  const selectedNodesLayer = new RenderLayer();
  // @ts-expect-error
  selectedNodesLayer.label = "SelectedNodesRenderLayer";

  selectedNodesLayerContainer.value!.addChild(selectedNodesLayer);
  canvasLayers.value.selectedNodes = selectedNodesLayer;
});
</script>

<template>
  <Node
    v-for="node in activeWorkflow!.nodes"
    :key="node.id"
    :position="node.position"
    :icon="getNodeIcon(node.id)"
    :type="getNodeType(node.id)"
    :name="getNodeName(node.id)"
    :node="node"
  />

  <Connector
    v-for="connector of activeWorkflow!.connections"
    :key="`connector-${connector.sourceNode}-${connector.sourcePort}-${connector.destNode}-${connector.destPort}`"
    v-bind="connector"
  />

  <Container ref="selectedNodesLayerContainer" />

  <FloatingConnector />

  <SelectionRectangle />
</template>
