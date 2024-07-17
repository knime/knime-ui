<script lang="ts">
import { defineComponent } from "vue";
import { mapState, mapGetters } from "vuex";
import Node from "@/components/workflow/node/Node.vue";
import MoveableNodeContainer from "@/components/workflow/node/MoveableNodeContainer.vue";
import Connector from "@/components/workflow/connectors/Connector.vue";
import WorkflowAnnotation from "@/components/workflow/annotations/WorkflowAnnotation.vue";
import MoveableAnnotationContainer from "@/components/workflow/annotations/MoveableAnnotationContainer.vue";
import MetaNodePortBars from "@/components/workflow/ports/MetaNodePortBars.vue";
import ConnectorLabel from "@/components/workflow/connectors/ConnectorLabel.vue";
import WorkflowPortalLayers from "./WorkflowPortalLayers.vue";

export default defineComponent({
  components: {
    WorkflowPortalLayers,
    Node,
    Connector,
    WorkflowAnnotation,
    MetaNodePortBars,
    ConnectorLabel,
    MoveableNodeContainer,
    MoveableAnnotationContainer,
  },

  expose: ["applyNodeSelectionPreview", "applyAnnotationSelectionPreview"],

  computed: {
    ...mapState("workflow", {
      workflow: "activeWorkflow",
      editableAnnotationId: "editableAnnotationId",
    }),

    ...mapGetters("selection", ["isNodeSelected"]),
    ...mapGetters("application", ["hasAnnotationModeEnabled"]),
    // Sort nodes so that selected nodes are rendered in front
    // TODO: NXT-904 Is there a more performant way to do this? Its one of the main reasons selections are slow.
    sortedNodes() {
      let selected: any[] = [];
      let unselected: any[] = [];

      for (const nodeId of Object.keys(this.workflow.nodes)) {
        if (this.isNodeSelected(nodeId)) {
          selected.push(this.workflow.nodes[nodeId]);
        } else {
          unselected.push(this.workflow.nodes[nodeId]);
        }
      }
      return [...unselected, ...selected];
    },
  },

  methods: {
    applyNodeSelectionPreview({
      nodeId,
      type,
    }: {
      nodeId: string;
      type: string;
    }) {
      (
        this.$refs[`node-${nodeId}`] as Array<InstanceType<typeof Node>>
      )[0].setSelectionPreview(type);
    },

    applyAnnotationSelectionPreview({
      annotationId,
      type,
    }: {
      annotationId: string;
      type: "hide" | "show" | "clear" | null;
    }) {
      (
        this.$refs[`annotation-${annotationId}`] as Array<
          InstanceType<typeof WorkflowAnnotation>
        >
      )[0].setSelectionPreview(type);
    },
  },
});
</script>

<template>
  <g class="workflow">
    <WorkflowPortalLayers>
      <template #workflowAnnotation>
        <MoveableAnnotationContainer
          v-for="annotation of workflow.workflowAnnotations"
          :id="annotation.id"
          :key="`annotation-${annotation.id}`"
          :class="{ disabled: hasAnnotationModeEnabled }"
          :bounds="annotation.bounds"
        >
          <WorkflowAnnotation
            v-if="editableAnnotationId !== annotation.id"
            :ref="`annotation-${annotation.id}`"
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
          v-for="connector of workflow.connections"
          :key="`connector-${connector.sourceNode}-${connector.sourcePort}-${connector.destNode}-${connector.destPort}`"
          :ref="`connector-${connector.id}`"
          :class="{ disabled: hasAnnotationModeEnabled }"
          v-bind="connector"
        />
      </template>

      <template #metaNodePortBars>
        <MetaNodePortBars
          v-if="workflow.info.containerType === 'metanode'"
          :class="{ disabled: hasAnnotationModeEnabled }"
        />
      </template>

      <template #nodes>
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
              :ref="`node-${node.id}`"
              :class="{ disabled: hasAnnotationModeEnabled }"
              v-bind="node"
              :icon="$store.getters['workflow/getNodeIcon'](node.id)"
              :name="$store.getters['workflow/getNodeName'](node.id)"
              :type="$store.getters['workflow/getNodeType'](node.id)"
              :position="position"
            />
          </template>
        </MoveableNodeContainer>
      </template>

      <template #connectorLabel>
        <ConnectorLabel
          v-for="(connector, id) of workflow.connections"
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
