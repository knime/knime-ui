<script>
import { mapState, mapGetters, mapMutations } from 'vuex';
import Node from '~/components/Node';
import Connector from '~/components/Connector';
import WorkflowAnnotation from '~/components/WorkflowAnnotation';
import Tooltip from '~/components/Tooltip';
import MetaNodePortBars from '~/components/MetaNodePortBars';
import KanvasFilters from '~/components/KanvasFilters';
import StreamedIcon from '~/components/../webapps-common/ui/assets/img/icons/nodes-connect.svg?inline';
import ConnectorLabel from '~/components/ConnectorLabel';

export default {
    components: {
        Node,
        Connector,
        WorkflowAnnotation,
        Tooltip,
        MetaNodePortBars,
        KanvasFilters,
        StreamedIcon,
        ConnectorLabel
    },
    data() {
        return {
            /**
             *  To avoid for mousedown on node, moving mouse, mouseup on kanvas to deselect nodes
             *  We track whether a click has been started on the empty Kanvas
             */
            clickStartedOnEmptyKanvas: false,
            keyEventListener: null
        };
    },
    computed: {
        ...mapState('workflow', {
            workflow: 'activeWorkflow',
            tooltip: 'tooltip'
        }),
        ...mapGetters('workflow', [
            'svgBounds',
            'isLinked',
            'isWritable',
            'isStreaming'
        ])
    },
    mounted() {
        this.keyEventListener = document.addEventListener('keydown', (e) => {
            if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
                e.stopPropagation();
                e.preventDefault();
                this.selectAllNodes();
            }
        });
    },
    beforeDestroy() {
        document.removeEventListener('keydown', this.keyEventListener);
    },
    methods: {
        ...mapMutations('workflow', ['selectAllNodes', 'deselectAllNodes']),
        onMouseDown(e) {
            // if mousedown on empty kanvas set flag
            this.clickStartedOnEmptyKanvas = e.target === this.$refs.svg;
        },
        onSelfMouseUp(e) {
            // deselect all nodes
            if (this.clickStartedOnEmptyKanvas) {
                this.deselectAllNodes();
            }
        }
    }
};
</script>

<template>
  <div :class="{ 'read-only': !isWritable }">
    <!-- Container for different notifications. At the moment there are streaming|linked notifications -->
    <div
      v-if="isLinked || isStreaming"
      :class="['type-notification', {onlyStreaming: isStreaming && !isLinked}]"
    >
      <span
        v-if="isLinked"
      >
        This is a linked {{ workflow.info.containerType }} and can therefore not be edited.
      </span>
      <span
        v-if="isStreaming"
        :class="['streaming-decorator', { isLinked }]"
      >
        <StreamedIcon class="streamingIcon" />
        <p>Streaming</p>
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
      ref="svg"
      :width="svgBounds.width"
      :height="svgBounds.height"
      :viewBox="`${svgBounds.x} ${svgBounds.y} ${svgBounds.width} ${svgBounds.height}`"
      @mousedown.left="onMouseDown"
      @mouseup.self.left="onSelfMouseUp"
    >

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
      <Connector
        v-for="(connector, id) of workflow.connections"
        :key="`connector-${workflow.projectId}-${id}`"
        v-bind="connector"
      />

      <!-- Metanode Port Bars (Inside of Metanodes) -->
      <MetaNodePortBars
        v-if="workflow.info.containerType === 'metanode'"
      />

      <!-- Non-Selected Nodes
        If node is not selected that portal has no effect.
        If node is selected, the portal will bring it to the front
       -->
      <portal
        v-for="(node, nodeId) in workflow.nodes"
        :key="`node-${workflow.projectId}-${nodeId}-portal`"
        :disabled="!node.selected"
        to="selected-nodes"
        slim
      >
        <Node
          :key="`node-${workflow.projectId}-${nodeId}`"
          :icon="$store.getters['workflow/nodeIcon']({ workflowId: workflow.projectId, nodeId })"
          :name="$store.getters['workflow/nodeName']({ workflowId: workflow.projectId, nodeId })"
          :type="$store.getters['workflow/nodeType']({ workflowId: workflow.projectId, nodeId })"
          :view="$store.getters['workflow/nodeView']({ workflowId: workflow.projectId, nodeId })"
          :dialog="$store.getters['workflow/nodeDialog']({ workflowId: workflow.projectId, nodeId })"
          v-bind="node"
        />
      </portal>

      <!-- Selected Nodes -->
      <portal-target
        multiple
        tag="g"
        name="selected-nodes"
      />

      <!-- Quick Actions Layer: Buttons for Hovered & Selected Nodes and their ids -->
      <portal-target
        multiple
        tag="g"
        name="node-actions"
      />

      <ConnectorLabel
        v-for="(connector, id) of workflow.connections"
        :key="`connector-label-${workflow.projectId}-${id}`"
        v-bind="connector"
      />
    </svg>
  </div>
</template>

<style lang="postcss" scoped>
svg {
  color: var(--knime-masala);
}

.tooltip-container {
  height: 0;
  line-height: 0;
}

.read-only {
  background-color: var(--knime-gray-ultra-light);
}

.type-notification {
  /* positioning */
  display: flex;
  margin: 0 10px;
  min-height: 40px;
  margin-bottom: -40px;
  left: 10px;
  top: 10px;
  position: sticky;
  z-index: 1;

  /* appearance */
  background-color: var(--notification-background-color);
  pointer-events: none;
  user-select: none;

  & span {
    font-size: 16px;
    align-self: center;
    text-align: center;
    width: 100%;
  }

  & p {
    font-size: 16px;
    align-self: center;
    text-align: center;
    margin-right: 10px;
  }
}

.streamingIcon {
  margin-right: 5px;
  width: 32px;
}

.streaming-decorator {
  pointer-events: none;
  display: flex;
  margin-right: 10px;
  height: 40px;
  justify-content: flex-end;
  flex-basis: 80px;
  flex-shrink: 0;

  & p {
    font-size: 16px;
    align-self: center;
    text-align: center;
  }

  &.isLinked p {
    margin-right: 10px;
  }
}

.onlyStreaming {
  background-color: unset;
  justify-content: flex-end;
  margin-right: 0;
}
</style>
