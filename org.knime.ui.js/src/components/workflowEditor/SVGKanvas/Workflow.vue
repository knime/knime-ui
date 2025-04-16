<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";

import { useCanvasModesStore } from "@/store/application/canvasModes";
import { useSelectionStore } from "@/store/selection";
import { useAnnotationInteractionsStore } from "@/store/workflow/annotationInteractions";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";

import WorkflowPortalLayers from "./WorkflowPortalLayers.vue";
import MoveableAnnotationContainer from "./annotations/MoveableAnnotationContainer.vue";
import WorkflowAnnotation from "./annotations/WorkflowAnnotation.vue";
import Connector from "./connectors/Connector.vue";
import ConnectorLabel from "./connectors/ConnectorLabel.vue";
import MoveableNodeContainer from "./node/MoveableNodeContainer.vue";
import Node from "./node/Node.vue";
import ComponentPlaceholder from "./node/placeholder/ComponentPlaceholder.vue";
import MetaNodePortBars from "./ports/MetaNodePortBars.vue";

const { activeWorkflow: workflow } = storeToRefs(useWorkflowStore());
const { getNodeIcon, getNodeName, getNodeType } = storeToRefs(
  useNodeInteractionsStore(),
);
const { editableAnnotationId } = storeToRefs(useAnnotationInteractionsStore());
const { isNodeSelected } = useSelectionStore();
const { hasAnnotationModeEnabled } = storeToRefs(useCanvasModesStore());

// TODO: NXT-904 Is there a more performant way to do this? Its one of the main reasons selections are slow.
const sortedNodes = computed(() => {
  let selected: any[] = [];
  let unselected: any[] = [];

  for (const nodeId of Object.keys(workflow.value!.nodes)) {
    if (isNodeSelected(nodeId)) {
      selected.push(workflow.value!.nodes[nodeId]);
    } else {
      unselected.push(workflow.value!.nodes[nodeId]);
    }
  }
  return [...unselected, ...selected];
});

const nodeRefs = ref<Record<string, any>>({});
const annotationRefs = ref<Record<string, any>>({});

const componentPlaceholders = computed(
  () => workflow.value?.componentPlaceholders ?? [],
);

const applyNodeSelectionPreview = ({
  nodeId,
  type,
}: {
  nodeId: string;
  type: string;
}) => {
  nodeRefs.value[`node-${nodeId}`].setSelectionPreview(type);
};

const applyAnnotationSelectionPreview = ({
  annotationId,
  type,
}: {
  annotationId: string;
  type: "hide" | "show" | "clear" | null;
}) => {
  annotationRefs.value[`annotation-${annotationId}`].setSelectionPreview(type);
};
defineExpose({ applyNodeSelectionPreview, applyAnnotationSelectionPreview });
</script>

<template>
  <g class="workflow">
    <WorkflowPortalLayers>
      <template #workflowAnnotation>
        <MoveableAnnotationContainer
          v-for="annotation of workflow!.workflowAnnotations"
          :id="annotation.id"
          :key="`annotation-${annotation.id}`"
          :class="{ disabled: hasAnnotationModeEnabled }"
          :bounds="annotation.bounds"
        >
          <WorkflowAnnotation
            v-if="editableAnnotationId !== annotation.id"
            :ref="(el) => (annotationRefs[`annotation-${annotation.id}`] = el)"
            :annotation="annotation"
          />

          <Portal v-else to="editable-annotation">
            <WorkflowAnnotation
              :ref="`annotation-${annotation.id}`"
              :annotation="annotation"
            />
          </Portal>
        </MoveableAnnotationContainer>
      </template>

      <template #connector>
        <!-- connector.id is NOT unique. Hence we use a custom key -->
        <Connector
          v-for="connector of workflow!.connections"
          :key="`connector-${connector.sourceNode}-${connector.sourcePort}-${connector.destNode}-${connector.destPort}`"
          :ref="`connector-${connector.id}`"
          :class="{ disabled: hasAnnotationModeEnabled }"
          v-bind="connector"
        />
      </template>

      <template #metaNodePortBars>
        <MetaNodePortBars
          v-if="workflow!.info.containerType === 'metanode'"
          :class="{ disabled: hasAnnotationModeEnabled }"
        />
      </template>

      <template #nodes>
        <ComponentPlaceholder
          v-for="componentPlaceholder of componentPlaceholders"
          :key="`placeholder-${componentPlaceholder.id}`"
          :placeholder="componentPlaceholder"
        />

        <MoveableNodeContainer
          v-for="node of sortedNodes"
          :id="node.id"
          :key="`node-${node.id}`"
          :class="{ disabled: hasAnnotationModeEnabled }"
          :position="node.position"
          :kind="node.kind"
        >
          <template #default="{ position }">
            <Node
              :ref="(el) => (nodeRefs[`node-${node.id}`] = el)"
              :class="{ disabled: hasAnnotationModeEnabled }"
              v-bind="node"
              :icon="getNodeIcon(node.id)"
              :name="getNodeName(node.id)"
              :type="getNodeType(node.id)"
              :position="position"
            />
          </template>
        </MoveableNodeContainer>
      </template>

      <template #connectorLabel>
        <ConnectorLabel
          v-for="(connector, id) of workflow!.connections"
          :key="`connector-label-${id}`"
          v-bind="connector"
        />
      </template>
    </WorkflowPortalLayers>
  </g>
</template>

<style scoped lang="postcss">
.disabled {
  pointer-events: none;

  /* disable actions on hover area, used to prevent the showing of the hover toolbar in annotation mode */
  &:deep(.hover-area) {
    pointer-events: none;
  }
}
</style>
