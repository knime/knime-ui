<script>
import { mapState, mapGetters } from 'vuex';
import Node from '~/components/Node';
import Connector from '~/components/Connector';
import WorkflowAnnotation from '~/components/WorkflowAnnotation';
import Tooltip from '~/components/Tooltip';

export default {
    components: {
        Node,
        Connector,
        WorkflowAnnotation,
        Tooltip
    },
    computed: {
        ...mapState('workflow', {
            workflow: 'activeWorkflow',
            tooltip: 'tooltip'
        }),
        ...mapGetters('workflow', ['svgBounds'])
    }
};
</script>

<template>
  <div>
    <div
      v-if="tooltip"
      class="tooltip-container"
    >
      <Tooltip
        v-bind="tooltip"
      />
    </div>

    <svg
      :width="svgBounds.width"
      :height="svgBounds.height"
      :viewBox="`${svgBounds.x} ${svgBounds.y} ${svgBounds.width} ${svgBounds.height}`"
    >
      <WorkflowAnnotation
        v-for="annotation of workflow.workflowAnnotations"
        :key="`annotation-${annotation.id}`"
        v-bind="annotation"
      />
      <Connector
        v-for="(connector, id) of workflow.connections"
        :key="`connector-${workflow.projectId}-${id}`"
        v-bind="connector"
      />
      <Node
        v-for="nodeId in workflow.nodeIds"
        :key="`node-${workflow.projectId}-${nodeId}`"
        :icon="$store.getters['nodes/icon']({ workflowId: workflow.projectId, nodeId })"
        :name="$store.getters['nodes/name']({ workflowId: workflow.projectId, nodeId })"
        :type="$store.getters['nodes/type']({ workflowId: workflow.projectId, nodeId })"
        v-bind="$store.state.nodes[workflow.projectId][nodeId]"
      />
      <portal-target
        multiple
        tag="g"
        name="node-select"
      />
    </svg>
  </div>
</template>

<style lang="postcss" scoped>
.tooltip-container {
  height: 0;
  line-height: 0;
}
</style>
