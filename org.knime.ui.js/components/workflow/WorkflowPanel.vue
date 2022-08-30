<script>
import { mapState, mapGetters } from 'vuex';
import StreamingIcon from '~/webapps-common/ui/assets/img/icons/nodes-connect.svg';
import ContextMenu from '@/components/application/ContextMenu.vue';
import WorkflowCanvas from '@/components/workflow/WorkflowCanvas.vue';
import PortTypeMenu from '@/components/workflow/ports/PortTypeMenu.vue';

export default {
    components: {
        StreamingIcon,
        ContextMenu,
        WorkflowCanvas,
        PortTypeMenu
    },
    data() {
        return {
            // null (or falsy) means context menu is invisible, otherwise should be an Object with x, y as Numbers
            contextMenuPosition: null,
            portTypeMenuConfig: null
        };
    },
    computed: {
        ...mapState('workflow', {
            workflow: 'activeWorkflow',
            activeWorkflowId: state => state.activeWorkflow.info.containerId
        }),
        ...mapGetters('workflow', [
            'isLinked',
            'isInsideLinked',
            'insideLinkedType',
            'isWritable',
            'isStreaming'
        ]),
        ...mapGetters('canvas', ['screenToCanvasCoordinates'])
    },
    methods: {
        onContextMenu(e) {
            // do nothing (also not preventing!) if source element has the following class set
            if (e.srcElement.classList.contains('native-context-menu')) {
                return;
            }
            // this is not done via modifier as we need to let the native context menu appear if the class is set
            e.preventDefault();

            // update position to current mouse coordinates

            let [x, y] = this.screenToCanvasCoordinates([e.clientX, e.clientY]);
            this.contextMenuPosition = { x, y };
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
        }
    }
};
</script>

<template>
  <div
    :class="['workflow-panel', { 'read-only': !isWritable }]"
    @contextmenu="onContextMenu"
    @open-port-type-menu="onOpenPortTypeMenu"
    @close-port-type-menu="onClosePortTypeMenu"
  >
    <ContextMenu
      v-if="Boolean(contextMenuPosition)"
      :position="contextMenuPosition"
      @menu-close="contextMenuPosition = null"
    />
    
    <PortTypeMenu
      v-if="Boolean(portTypeMenuConfig)"
      :key="portTypeMenuConfig.id"
      ref="portTypeMenu"
      v-bind="portTypeMenuConfig.props"
      v-on="portTypeMenuConfig.events"
    />

    <!-- Container for different notifications. At the moment there are streaming|linked notifications -->
    <div
      v-if="isLinked || isStreaming || isInsideLinked"
      :class="['workflow-info', { onlyStreaming: isStreaming && !isLinked }]"
    >
      <span v-if="isInsideLinked">
        This is a {{ workflow.info.containerType }} inside a linked {{ insideLinkedType }} and cannot be edited.
      </span>
      <span v-else-if="isLinked">
        This is a linked {{ workflow.info.containerType }} and can therefore not be edited.
      </span>
      <span
        v-if="isStreaming"
        :class="['streaming-indicator', { isLinked }]"
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

  &.onlyStreaming {
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

    &.isLinked {
      margin-right: 10px;
    }
  }
}
</style>
