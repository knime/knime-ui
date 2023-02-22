<script>
import { mapGetters } from 'vuex';
import WorkflowMetadata from '@/components/workflowMetadata/WorkflowMetadata.vue';
import NodeDescription from '@/components/nodeRepository/NodeDescription.vue';

/**
 * Shows metadata based on the current selection either of the whole workflow or the selected node (if its only one)
 */
export default {
    components: {
        WorkflowMetadata,
        NodeDescription
    },
    computed: {
        ...mapGetters('selection', ['singleSelectedNode']),
        ...mapGetters('workflow', ['getNodeName', 'getNodeFactory']),
        showNodeDescription() {
            // do not show description for metanodes and components
            return this.singleSelectedNode && this.singleSelectedNode.kind === 'node';
        },
        selectedNode() {
            // transform this into a node repo like node object
            const { id } = this.singleSelectedNode;
            return {
                name: this.getNodeName(id),
                nodeFactory: this.getNodeFactory(id)
            };
        }
    }
};
</script>

<template>
  <NodeDescription
    v-if="showNodeDescription"
    :selected-node="selectedNode"
  />
  <WorkflowMetadata
    v-else
    key="workflow-metadata"
  />
</template>
