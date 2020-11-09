<script>
import { mapState, mapGetters } from 'vuex';
import Node from '~/components/Node';
import Connector from '~/components/Connector';
import WorkflowAnnotation from '~/components/WorkflowAnnotation';
import Tooltip from '~/components/Tooltip';
import MetaNodePortBars from '~/components/MetaNodePortBars';

export default {
    components: {
        Node,
        Connector,
        WorkflowAnnotation,
        Tooltip,
        MetaNodePortBars
    },
    provide() {
        return {
            readOnly: this.isReadOnly
        };
    },
    computed: {
        ...mapState('workflow', {
            workflow: 'activeWorkflow',
            readOnly: state => state.activeWorkflow.info.linked,
            tooltip: 'tooltip'
        }),
        ...mapGetters('workflow', ['svgBounds'])
    }
};
</script>

<template>
  <div :class="{ 'read-only': readOnly }">
    <div
      v-if="readOnly"
      class="link-notification"
    >
      <span>
        This is a linked {{ workflow.info.containerType }} and can therefore not be edited.
      </span>
    </div>

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
      <MetaNodePortBars
        v-if="workflow.info.containerType === 'metanode'"
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
svg {
  color: var(--knime-masala);
  position: relative; /* needed for z-index to have effect */
}

.tooltip-container {
  height: 0;
  line-height: 0;
}

.read-only {
  background-color: var(--knime-gray-ultra-light);
}

.link-notification {
  /* positioning */
  display: flex;
  margin: 0 10px;
  height: 40px;
  margin-bottom: -40px;
  left: 10px;
  top: 10px;
  position: sticky;
  z-index: 1;

  /* appearance */
  background-color: var(--notification-background-color);
  pointer-events: none;

  & span {
    font-size: 16px;
    align-self: center;
    text-align: center;
    width: 100%;
  }
}
</style>
