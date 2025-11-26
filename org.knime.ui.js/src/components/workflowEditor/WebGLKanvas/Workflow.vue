<script setup lang="ts">
import { computed, onMounted, useTemplateRef } from "vue";
import { storeToRefs } from "pinia";
import { RenderLayer } from "pixi.js";

import { WorkflowInfo } from "@/api/gateway-api/generated-api";
import {
  type CanvasLayerNames,
  useWebGLCanvasStore,
} from "@/store/canvas/canvas-webgl";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import type { ContainerInst } from "@/vue3-pixi";

import SelectionRectangle from "./SelectionRectangle/SelectionRectangle.vue";
import StaticWorkflowAnnotation from "./annotations/StaticWorkflowAnnotation.vue";
import Connector from "./connectors/Connector.vue";
import ConnectorLabel from "./connectors/ConnectorLabel.vue";
import FloatingConnector from "./floatingConnector/FloatingConnector.vue";
import Node from "./node/Node.vue";
import ComponentPlaceholder from "./node/placeholder/ComponentPlaceholder.vue";
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
const annotationControlsLayerContainer = useTemplateRef<ContainerInst>(
  "annotationControlsLayerContainer",
);

const componentPlaceholders = computed(
  () => activeWorkflow.value?.componentPlaceholders ?? [],
);

const createRenderLayer = (
  name: CanvasLayerNames,
  container: ContainerInst,
) => {
  const layer = new RenderLayer();
  layer.label = `${name}RenderLayer`;

  container.addChild(layer);
  canvasLayers.value[name] = layer;
};

onMounted(() => {
  // add a layer for nodes that are selected, so that they get displayed
  // above other nodes
  createRenderLayer("selectedNodes", selectedNodesLayerContainer.value!);

  // add layer for selected ports so that the selected port + action button
  // get rendered above other elements
  createRenderLayer("selectedPorts", selectedPortsLayerContainer.value!);

  // controls of the annotation need to be above everything when in edit mode
  createRenderLayer(
    "annotationControls",
    annotationControlsLayerContainer.value!,
  );
});

// we need to keep the order of the annotations stable
// otherwise the order will be broken when the backend re-sorts stuff
// because vue-pixi will then reshuffle things which we do not want
// to get the proper order we use a render layer with sortableChildren: true and z-index
// TODO: remove when NXT-3660 is done
const annotations = computed(
  () =>
    activeWorkflow.value?.workflowAnnotations
      .map((value, index) => ({ ...value, order: index }))
      .toSorted((a, b) => (a.id < b.id ? -1 : 1)),
);
</script>

<template>
  <template v-if="activeWorkflow">
    <Container label="AnnotationsContainer">
      <StaticWorkflowAnnotation
        v-for="annotation in annotations"
        :key="annotation.id"
        :annotation="annotation"
        :layer="canvasLayers.annotations"
        :z-index="annotation.order"
      />
    </Container>

    <MetanodePortBars
      v-if="
        activeWorkflow!.info.containerType ===
        WorkflowInfo.ContainerTypeEnum.Metanode
      "
    />

    <ComponentPlaceholder
      v-for="componentPlaceholder of componentPlaceholders"
      :key="`placeholder-${componentPlaceholder.id}`"
      :placeholder="componentPlaceholder"
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
    <template
      v-for="(connector, id) of activeWorkflow.connections"
      :key="`connector-label-${id}`"
    >
      <ConnectorLabel
        v-if="(connector.label ?? '').length > 0"
        v-bind="connector"
      />
    </template>

    <Container ref="selectedNodesLayerContainer" />
    <Container ref="selectedPortsLayerContainer" />
    <Container ref="annotationControlsLayerContainer" />

    <FloatingConnector />

    <SelectionRectangle />
  </template>
</template>
