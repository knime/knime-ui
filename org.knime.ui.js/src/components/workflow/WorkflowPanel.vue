<script>
import { mapState, mapGetters } from 'vuex';
import StreamingIcon from 'webapps-common/ui/assets/img/icons/nodes-connect.svg';
import ContextMenu from '@/components/application/ContextMenu.vue';
import WorkflowCanvas from '@/components/workflow/WorkflowCanvas.vue';
import PortTypeMenu from '@/components/workflow/ports/PortTypeMenu.vue';
import QuickAddNodeMenu from '@/components/workflow/node/quickAdd/QuickAddNodeMenu.vue';

export default {
    components: {
        StreamingIcon,
        ContextMenu,
        WorkflowCanvas,
        QuickAddNodeMenu,
        PortTypeMenu
    },
    data() {
        return {
            portTypeMenuConfig: null,
            quickAddNodeMenuConfig: null
        };
    },
    computed: {
        ...mapState('workflow', {
            workflow: 'activeWorkflow',
            activeWorkflowId: state => state.activeWorkflow.info.containerId
        }),
        ...mapState('application', ['contextMenu']),
        ...mapGetters('workflow', [
            'isLinked',
            'isInsideLinked',
            'insideLinkedType',
            'isWritable',
            'isStreaming'
        ]),
        ...mapGetters('canvas', ['screenToCanvasCoordinates']),
        ...mapGetters('selection', ['selectedNodeIds'])
    },
    watch: {
        selectedNodeIds() {
            if (this.quickAddNodeMenuConfig) {
                this.quickAddNodeMenuConfig.events['menu-close']();
            }
        }
    },
    methods: {
        toggleContextMenu(e) {
            if (!this.contextMenu.isOpen && (this.portTypeMenuConfig || this.quickAddNodeMenuConfig)) {
                this.quickAddNodeMenuConfig?.events['menu-close']?.();
                this.portTypeMenuConfig?.events['menu-close']?.();
            }

            this.$store.dispatch('application/toggleContextMenu', e);
        },
        onOpenPortTypeMenu(e) {
            if (this.portTypeMenuConfig && this.portTypeMenuConfig.id !== e.detail.id) {
                // if another menu than the current one sends an open signal, close the other one first
                this.portTypeMenuConfig.events['menu-close']();
            }
            this.portTypeMenuConfig = e.detail;
        },
        onClosePortTypeMenu(e) {
            // if the menu that is currently open sends a close signal, then close the current menu
            if (this.portTypeMenuConfig.id === e.detail.id) {
                this.portTypeMenuConfig = null;
            }
        },
        onOpenQuickAddNodeMenu(e) {
            if (this.quickAddNodeMenuConfig && this.quickAddNodeMenuConfig.id !== e.detail.id) {
                // if another menu than the current one sends an open signal, close the other one first
                this.quickAddNodeMenuConfig.events['menu-close']();
            }
            this.quickAddNodeMenuConfig = e.detail;
        },
        onCloseQuickAddNodeMenu(e) {
            // if the menu that is currently open sends a close signal, then close the current menu
            if (this.quickAddNodeMenuConfig.id === e.detail.id) {
                this.quickAddNodeMenuConfig = null;
            }
        }
    }
};
</script>

<template>
  <div
    :class="['workflow-panel', { 'read-only': !isWritable }]"
    @contextmenu="toggleContextMenu"
    @open-port-type-menu="onOpenPortTypeMenu"
    @close-port-type-menu="onClosePortTypeMenu"
    @open-quick-add-node-menu="onOpenQuickAddNodeMenu"
    @close-quick-add-node-menu="onCloseQuickAddNodeMenu"
  >
    <ContextMenu
      v-if="contextMenu.isOpen"
      :position="contextMenu.position"
      @menu-close="toggleContextMenu"
    />

    <PortTypeMenu
      v-if="Boolean(portTypeMenuConfig)"
      :key="portTypeMenuConfig.id"
      v-bind="portTypeMenuConfig.props"
      v-on="portTypeMenuConfig.events"
    />

    <QuickAddNodeMenu
      v-if="Boolean(quickAddNodeMenuConfig)"
      :key="quickAddNodeMenuConfig.id"
      v-bind="quickAddNodeMenuConfig.props"
      v-on="quickAddNodeMenuConfig.events"
    />

    <!-- Container for different notifications. At the moment there are streaming|linked notifications -->
    <div
      v-if="isLinked || isStreaming || isInsideLinked"
      :class="['workflow-info', { 'only-streaming': isStreaming && !isLinked }]"
    >
      <span v-if="isInsideLinked">
        This is a {{ workflow.info.containerType }} inside a linked {{ insideLinkedType }} and cannot be edited.
      </span>
      <span v-else-if="isLinked">
        This is a linked {{ workflow.info.containerType }} and can therefore not be edited.
      </span>
      <span
        v-if="isStreaming"
        :class="['streaming-indicator', { 'is-linked': isLinked }]"
      >
        <StreamingIcon />
        Streaming
      </span>
    </div>

    <!--
      Setting key to match exactly one workflow, causes knime-ui to re-render the whole component,
      instead of diffing old and new workflow.
    -->
    <WorkflowCanvas :key="`${workflow.projectId}-${activeWorkflowId}`" />
  </div>
</template>

<style lang="postcss" scoped>
.workflow-panel {
  height: 100%;
  width: 100%;
}

.read-only {
  background-color: var(--knime-gray-ultra-light);
}

.workflow-info {
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

  &.only-streaming {
    background-color: unset;
    justify-content: flex-end;
    margin-right: 0;
  }

  & span {
    font-size: 16px;
    align-self: center;
    text-align: center;
    width: 100%;
  }

  & .streaming-indicator {
    pointer-events: none;
    display: flex;
    margin-right: 10px;
    height: 40px;
    justify-content: flex-end;
    flex-basis: 80px;
    flex-shrink: 0;
    align-items: center;

    & svg {
      margin-right: 5px;
      width: 32px;
    }

    &.is-linked {
      margin-right: 10px;
    }
  }
}
</style>
