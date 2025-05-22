<script setup lang="ts">
import { onMounted, useTemplateRef } from "vue";
import { storeToRefs } from "pinia";
import { RenderLayer } from "pixi.js";

import { WorkflowInfo } from "@/api/gateway-api/generated-api";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import type { ContainerInst } from "@/vue3-pixi";

import SelectionRectangle from "./SelectionRectangle/SelectionRectangle.vue";
import StaticWorkflowAnnotation from "./annotations/StaticWorkflowAnnotation.vue";
import Connector from "./connectors/Connector.vue";
import FloatingConnector from "./floatingConnector/FloatingConnector.vue";
import Node from "./node/Node.vue";
import MetanodePortBars from "./portbars/MetanodePortBars.vue";

const { activeWorkflow } = storeToRefs(useWorkflowStore());
const { getNodeIcon, getNodeName, getNodeType } = storeToRefs(
  useNodeInteractionsStore(),
);

const canvasStore = useWebGLCanvasStore();
const { canvasLayers } = storeToRefs(canvasStore);

const selectedNodesLayerContainer = useTemplateRef<ContainerInst>(
  "selectedNodesLayerContainer",
);

const selectedPortsLayerContainer = useTemplateRef<ContainerInst>(
  "selectedPortsLayerContainer",
);
const annotationControlsContainer = useTemplateRef<ContainerInst>(
  "annotationControlsContainer",
);

onMounted(() => {
  // add a layer for nodes that are selected, so that they get displayed
  // above other nodes
  const selectedNodesLayer = new RenderLayer();
  // @ts-expect-error Property 'label' does not exist on type 'IRenderLayer'
  selectedNodesLayer.label = "SelectedNodesRenderLayer";

  selectedNodesLayerContainer.value!.addChild(selectedNodesLayer);
  canvasLayers.value.selectedNodes = selectedNodesLayer;

  // add layer for selected ports so that the selected port + action button
  // get rendered above other elements
  const selectedPortsLayer = new RenderLayer();
  // @ts-expect-error Property 'label' does not exist on type 'IRenderLayer'
  selectedPortsLayer.label = "SelectedPortsRenderLayer";
  selectedPortsLayerContainer.value!.addChild(selectedPortsLayer);
  canvasLayers.value.selectedPorts = selectedPortsLayer;

  // controls of the annotation need to be above everything when in edit mode
  const annotationControlsLayer = new RenderLayer();
  // @ts-expect-error Property 'label' does not exist on type 'IRenderLayer'
  annotationControlsLayer.label = "AnnotationControlsRenderLayer";
  annotationControlsContainer.value!.addChild(annotationControlsLayer);
  canvasLayers.value.annotationControls = selectedPortsLayer;
});
</script>

<template>
  <template v-if="activeWorkflow">
    <template
      v-for="(annotation, index) in activeWorkflow!.workflowAnnotations"
      :key="annotation.id"
    >
      <StaticWorkflowAnnotation
        :annotation="annotation"
        :layer="canvasLayers.annotations"
        :z-index="index"
      />
    </template>

    <MetanodePortBars
      v-if="
        activeWorkflow!.info.containerType ===
        WorkflowInfo.ContainerTypeEnum.Metanode
      "
    />

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
    <Container ref="selectedPortsLayerContainer" />
    <Container ref="annotationControlsContainer" />

    <FloatingConnector />

    <SelectionRectangle />
  </template>
</template>
