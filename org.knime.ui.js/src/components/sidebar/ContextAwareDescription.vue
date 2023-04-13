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
  <div class="context-aware-description">
    <NodeDescription
      v-if="showNodeDescription"
      class="node-description"
      :selected-node="selectedNode"
    />
    <WorkflowMetadata
      v-else
      key="workflow-metadata"
    />
  </div>
</template>

<style lang="postcss">
.context-aware-description {
  /* required for the scrollbar of NodeDescription to work proper */
  height: 100%;
}

.node-description {
  /* required for sticky header in NodeDescription to have a background to inherit */
  background-color: var(--knime-porcelain);
}
</style>
