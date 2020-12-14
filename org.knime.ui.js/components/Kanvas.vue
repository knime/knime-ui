<script>
import { mapState, mapGetters } from 'vuex';
import Node from '~/components/Node';
import Connector from '~/components/Connector';
import WorkflowAnnotation from '~/components/WorkflowAnnotation';
import Tooltip from '~/components/Tooltip';
import MetaNodePortBars from '~/components/MetaNodePortBars';
import ZoomContainer from '~/components/ZoomContainer';

export default {
    components: {
        Node,
        Connector,
        WorkflowAnnotation,
        Tooltip,
        MetaNodePortBars,
        ZoomContainer
    },
    computed: {
        ...mapState('workflow', {
            workflow: 'activeWorkflow',
            tooltip: 'tooltip'
        }),
        ...mapGetters('workflow', [
            'svgBounds',
            'isLinked',
            'isWritable'
        ])
    }
};
</script>

<template>
  <div
    ref="scroller"
    :class="{ 'read-only': !isWritable }"
  >
    <div
      v-if="isLinked"
      class="link-notification"
    >
      <span>
        This is a linked {{ workflow.info.containerType }} and can therefore not be edited.
      </span>
    </div>

    <div
      class="tooltip-container"
    >
      <Tooltip
        v-bind="tooltip"
      />
    </div>
    <ZoomContainer :scroller="$refs.scroller">
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
          v-for="(node, nodeId) in workflow.nodes"
          :key="`node-${workflow.projectId}-${nodeId}`"
          :icon="$store.getters['workflow/nodeIcon']({ workflowId: workflow.projectId, nodeId })"
          :name="$store.getters['workflow/nodeName']({ workflowId: workflow.projectId, nodeId })"
          :type="$store.getters['workflow/nodeType']({ workflowId: workflow.projectId, nodeId })"
          v-bind="node"
        />
        <portal-target
          multiple
          tag="g"
          name="node-select"
        />
      </svg>
    </ZoomContainer>
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
