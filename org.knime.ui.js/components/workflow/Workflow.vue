<script>
import { mapState, mapGetters } from 'vuex';
import Node from '~/components/workflow/Node';
import MoveableNodeContainer from '~/components/workflow/MoveableNodeContainer';
import Connector from '~/components/workflow/Connector';
import WorkflowAnnotation from '~/components/workflow/WorkflowAnnotation';
import MetaNodePortBars from '~/components/workflow/MetaNodePortBars';
import KanvasFilters from '~/components/workflow/KanvasFilters';
import ConnectorLabel from '~/components/workflow/ConnectorLabel';
import { dropNode } from '~/mixins';

export default {
    components: {
        Node,
        Connector,
        WorkflowAnnotation,
        MetaNodePortBars,
        KanvasFilters,
        ConnectorLabel,
        MoveableNodeContainer
    },
    mixins: [dropNode],
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
  <g>
    <!-- Includes shadows for Nodes -->
    <KanvasFilters />

    <!-- Workflow Annotation Layer. Background -->
    <WorkflowAnnotation
      v-for="annotation of workflow.workflowAnnotations"
      :key="`annotation-${annotation.id}`"
      v-bind="annotation"
    />

    <!-- Node Selection Plane Layer -->
    <portal-target
      multiple
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
      <Node
        :ref="`node-${node.id}`"
        :icon="$store.getters['workflow/getNodeIcon'](node.id)"
        :name="$store.getters['workflow/getNodeName'](node.id)"
        :type="$store.getters['workflow/getNodeType'](node.id)"
        v-bind="node"
      />
    </MoveableNodeContainer>

    <!-- Quick Actions Layer: Buttons for Hovered & Selected Nodes and their ids -->
    <portal-target
      multiple
      tag="g"
      name="node-actions"
    />

    <ConnectorLabel
      v-for="(connector, id) of workflow.connections"
      :key="`connector-label-${id}`"
      v-bind="connector"
    />

    <portal-target
      tag="g"
      name="drag-connector"
    />
  </g>
</template>
