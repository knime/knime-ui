<script>
import { mapState, mapGetters } from 'vuex';
import Button from 'webapps-common/ui/components/Button.vue';
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
        PortTypeMenu,
        Button
    },
    computed: {
        ...mapState('workflow', {
            workflow: 'activeWorkflow',
            activeWorkflowId: state => state.activeWorkflow.info.containerId
        }),
        ...mapState('workflow', [
            'portTypeMenu',
            'quickAddNodeMenu'
        ]),
        ...mapState('application', ['contextMenu']),
        ...mapGetters('workflow', [
            'isLinked',
            'isInsideLinked',
            'insideLinkedType',
            'isWritable',
            'isStreaming',
            'isOnHub'
        ]),
        ...mapGetters('canvas', ['screenToCanvasCoordinates']),
        ...mapGetters('selection', ['selectedNodeIds'])
    },
    watch: {
        // close quickAddNodeMenu if node selection changes
        selectedNodeIds() {
            if (this.quickAddNodeMenu.isOpen) {
                this.quickAddNodeMenu.events['menu-close']?.();
            }
        }
    },
    methods: {
        toggleContextMenu(event) {
            this.$store.dispatch('application/toggleContextMenu', { event });
        },
        onContextMenu(event) {
            // this is the only place where we handle native context menu events
            if (event.srcElement.classList.contains('native-context-menu')) {
                return;
            }
            // prevent native context menus to appear
            event.preventDefault();
        },
        onSaveLocalCopy() {
            console.log('clicked');
        }
    }
};
</script>

<template>
  <div
    :class="['workflow-panel', { 'read-only': !isWritable }]"
    @contextmenu.stop="onContextMenu"
    @pointerdown.right="contextMenu.isOpen && toggleContextMenu($event)"
  >
    <ContextMenu
      v-if="contextMenu.isOpen"
      :position="contextMenu.position"
      @menu-close="toggleContextMenu"
    />

    <PortTypeMenu
      v-if="portTypeMenu.isOpen"
      v-bind="portTypeMenu.props"
      v-on="portTypeMenu.events"
    />

    <QuickAddNodeMenu
      v-if="quickAddNodeMenu.isOpen"
      v-bind="quickAddNodeMenu.props"
      v-on="quickAddNodeMenu.events"
    />

    <!-- Container for different notifications. At the moment there are streaming|linked notifications -->
    <div
      v-if="isLinked || isStreaming || isInsideLinked || isOnHub"
      :class="['workflow-info', { 'only-streaming': isStreaming && !isLinked }, { 'only-on-hub': isOnHub }]"
    >
      <span v-if="isInsideLinked">
        This is a {{ workflow.info.containerType }} inside a linked {{ insideLinkedType }} and cannot be edited.
      </span>
      <span v-else-if="isLinked">
        This is a linked {{ workflow.info.containerType }} and can therefore not be edited.
      </span>
      <div
        v-if="isOnHub"
        class="banner"
      >
        <span>
          This is a temporary preview, save as a local copy if you want to edit it.
        </span>
        <Button
          primary
          compact
          class="button"
          @click="onSaveLocalCopy"
        >
          Save local copy
        </Button>
      </div>
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

  &.only-on-hub {
    background-color: rgba(255 216 0 / 20%);
  }

  & .banner {
    width: 100%;
    display: flex;
    padding: 5px 10px;
  }

  & span {
    font-size: 16px;
    align-self: center;
    text-align: center;
    width: 100%;
  }

  & .button {
    width: 150px;
    pointer-events: all;
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

  /* & .banner {
    display: flex;
    justify-content: space-between;
  } */
}
</style>
