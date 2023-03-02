<script>
import { mapState, mapGetters } from 'vuex';
import Node from '@/components/workflow/node/Node.vue';
import MoveableNodeContainer from '@/components/workflow/node/MoveableNodeContainer.vue';
import Connector from '@/components/workflow/connectors/Connector.vue';
import WorkflowAnnotation from '@/components/workflow/annotations/WorkflowAnnotation.vue';
import MetaNodePortBars from '@/components/workflow/ports/MetaNodePortBars.vue';
import ConnectorLabel from '@/components/workflow/connectors/ConnectorLabel.vue';

export default {
    components: {
        Node,
        Connector,
        WorkflowAnnotation,
        MetaNodePortBars,
        ConnectorLabel,
        MoveableNodeContainer
    },
    computed: {
        ...mapState('workflow', {
            workflow: 'activeWorkflow'
        }),
        ...mapGetters('selection', ['isNodeSelected']),
        // Sort nodes so that selected nodes are rendered in front
        // TODO: NXT-904 Is there a more performant way to do this? Its one of the main reasons selections are slow.
        sortedNodes() {
            let selected = [];
            let unselected = [];

            for (const nodeId of Object.keys(this.workflow.nodes)) {
                if (this.isNodeSelected(nodeId)) {
                    selected.push(this.workflow.nodes[nodeId]);
                } else {
                    unselected.push(this.workflow.nodes[nodeId]);
                }
            }
            return [...unselected, ...selected];
        }
    },
    methods: {
        // public
        applyNodeSelectionPreview({ nodeId, type }) {
            this.$refs[`node-${nodeId}`][0].setSelectionPreview(type);
        }
    }
};
</script>

<template>
  <g class="workflow">
    <!-- Workflow Annotation Layer. Background -->
    <WorkflowAnnotation
      v-for="annotation of workflow.workflowAnnotations"
      :key="`annotation-${annotation.id}`"
      v-bind="annotation"
    />

    <!-- Node Selection Plane Layer -->
    <PortalTarget
      tag="g"
      name="node-select"
    />

    <!-- Connectors Layer -->
    <!-- connector.id is NOT unique. Hence we use a custom key -->
    <Connector
      v-for="connector of workflow.connections"
      :key="`connector-${connector.sourceNode}-${connector.sourcePort}-${connector.destNode}-${connector.destPort}`"
      v-bind="connector"
    />

    <!-- Metanode Port Bars (Inside of Metanodes) -->
    <MetaNodePortBars
      v-if="workflow.info.containerType === 'metanode'"
    />

    <MoveableNodeContainer
      v-for="node of sortedNodes"
      :id="node.id"
      :key="`node-${node.id}`"
      :position="node.position"
      :kind="node.kind"
    >
      <template #default="{ position }">
        <Node
          :ref="`node-${node.id}`"
          v-bind="node"
          :icon="$store.getters['workflow/getNodeIcon'](node.id)"
          :name="$store.getters['workflow/getNodeName'](node.id)"
          :type="$store.getters['workflow/getNodeType'](node.id)"
          :position="position"
        />
      </template>
    </MoveableNodeContainer>

    <!-- Editor Layer; only one editor is open at a time -->
    <PortalTarget
      tag="g"
      name="node-text-editor"
    />

    <!-- Quick Actions Layer: Buttons for Hovered & Selected Nodes and their ids -->
    <PortalTarget
      tag="g"
      name="node-actions"
    />

    <ConnectorLabel
      v-for="(connector, id) of workflow.connections"
      :key="`connector-label-${id}`"
      v-bind="connector"
    />

    <PortalTarget
      tag="g"
      name="selected-port"
    />

    <PortalTarget
      tag="g"
      name="drag-connector"
    />
  </g>
</template>
