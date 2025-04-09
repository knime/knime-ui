<script setup lang="ts">
import { onMounted, useTemplateRef } from "vue";
import { storeToRefs } from "pinia";
import { RenderLayer } from "pixi.js";

import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useAnnotationInteractionsStore } from "@/store/workflow/annotationInteractions";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import type { ContainerInst } from "@/vue3-pixi";

import SelectionRectangle from "./SelectionRectangle/SelectionRectangle.vue";
import StaticWorkflowAnnotation from "./annotations/StaticWorkflowAnnotation.vue";
import Connector from "./connectors/Connector.vue";
import FloatingConnector from "./floatingConnector/FloatingConnector.vue";
import Node from "./node/Node.vue";

const { activeWorkflow } = storeToRefs(useWorkflowStore());
const { getNodeIcon, getNodeName, getNodeType } = storeToRefs(
  useNodeInteractionsStore(),
);
const { editableAnnotationId } = storeToRefs(useAnnotationInteractionsStore());

const canvasStore = useWebGLCanvasStore();
const { canvasLayers } = storeToRefs(canvasStore);

const selectedNodesLayerContainer = useTemplateRef<ContainerInst>(
  "selectedNodesLayerContainer",
);

onMounted(() => {
  // add a layer for nodes that are selected, so that they get displayed
  // above other nodes
  const selectedNodesLayer = new RenderLayer();
  // @ts-expect-error (please add error description)
  selectedNodesLayer.label = "SelectedNodesRenderLayer";

  selectedNodesLayerContainer.value!.addChild(selectedNodesLayer);
  canvasLayers.value.selectedNodes = selectedNodesLayer;
});
</script>

<template>
  <template v-if="activeWorkflow">
    <template
      v-for="annotation of activeWorkflow!.workflowAnnotations"
      :key="annotation.id"
    >
      <StaticWorkflowAnnotation
        v-if="editableAnnotationId !== annotation.id"
        :annotation="annotation"
      />
    </template>

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
      v-for="connector of activeWorkflow.connections"
      :key="`connector-${connector.sourceNode}-${connector.sourcePort}-${connector.destNode}-${connector.destPort}`"
      v-bind="connector"
    />

    <Container ref="selectedNodesLayerContainer" />

    <FloatingConnector />

    <SelectionRectangle />
  </template>
</template>
