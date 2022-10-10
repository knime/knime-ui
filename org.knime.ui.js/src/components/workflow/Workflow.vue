<script>
import { mapState, mapGetters } from 'vuex';
import Node from '@/components/workflow/node/Node.vue';
import MoveableNodeContainer from '@/components/workflow/node/MoveableNodeContainer.vue';
import Connector from '@/components/workflow/connectors/Connector.vue';
import WorkflowAnnotation from '@/components/workflow/annotations/WorkflowAnnotation.vue';
import MetaNodePortBars from '@/components/workflow/ports/MetaNodePortBars.vue';
import ConnectorLabel from '@/components/workflow/connectors/ConnectorLabel.vue';
import { dropNode } from '@/mixins';

export default {
    components: {
        Node,
        Connector,
        WorkflowAnnotation,
        MetaNodePortBars,
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
        },
        selectedPortTransition() {
            // returns a functional component that is used as transition prop on <portal>. This way the transition
            // behaves as without portal, see https://portal-vue.linusb.org/api/portal-target.html#transition
            return {
                render(h) {
                    return h('transition', { props: { name: 'fade' } }, this.$slots.default);
                }
            };
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
      name="node-name-editor"
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
    <!-- :transition="selectedPortTransition" -->
    
    <PortalTarget
      tag="g"
      name="drag-connector"
    />
  </g>
</template>

<style lang="postcss" scoped>
/*
  This targets the action button of the selected port. This workarond is required in order to make the transition
  work, for SVG elements coming into and out of a portal (html element work with the provided vue-portal API)
*/
.workflow {
  --selected-port-transition-time: 150ms;
}

:deep(.action-button) {
  transition: all var(--selected-port-transition-time) ease-in;
  transform: scale(1);
}

:deep(.selected-port) {
  transition: opacity var(--selected-port-transition-time) ease-out;
  opacity: 1;
}

.fade-enter {
  & :deep(.action-button) {
    opacity: 0;
    transform: scale(0);
  }

  & :deep(.selected-port) {
    opacity: 0;
  }
}

.fade-leave-to {
  & :deep(.action-button) {
    transform: scale(0);
  }

  & :deep(.selected-port) {
    opacity: 0;
  }
}

.fade-leave-active {
  transition: opacity var(--selected-port-transition-time) ease-out;
}
</style>
