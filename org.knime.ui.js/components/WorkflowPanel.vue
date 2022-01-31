<script>
import { mapState, mapGetters, mapActions } from 'vuex';
import StreamingIcon from '~/webapps-common/ui/assets/img/icons/nodes-connect.svg?inline';
import ContextMenu from '~/components/ContextMenu';
import Workflow from '~/components/workflow/Workflow';
import Kanvas from '~/components/Kanvas';

import { dropNode } from '~/mixins';

export default {
    components: {
        StreamingIcon,
        ContextMenu,
        Workflow,
        Kanvas
    },
    mixins: [dropNode],
    computed: {
        ...mapState('workflow', {
            workflow: 'activeWorkflow'
        }),
        ...mapGetters('workflow', [
            'isLinked',
            'isInsideLinked',
            'insideLinkedType',
            'isWritable',
            'isStreaming',
            'activeWorkflowId'
        ])
    },
    watch: {
        async workflow() {
            // this.$refs.kanvas.scrollTo(0, 0);
        }
    },
    methods: {
        /*
          Selection
        */
        ...mapActions('selection', ['deselectAllObjects']),
        onEmptyPointerDown() {
            // remove selection
            this.deselectAllObjects();
        },
        onContextMenu(e) {
            // TODO: NXT-844 why prevent right clicks with ctrl?
            // ignore click with ctrl and meta keys
            if (e.ctrlKey || e.metaKey) {
                return;
            }
            this.$refs.contextMenu.show(e);
        }
    }
};
</script>

<template>
  <div
    :class="['workflow-panel', { 'read-only': !isWritable }]"
    @drop.stop="onDrop"
    @dragover.stop="onDragOver"
    @contextmenu.prevent="onContextMenu"
  >
    <ContextMenu
      ref="contextMenu"
    />

    <!-- Container for different notifications. At the moment there are streaming|linked notifications -->
    <div
      v-if="isLinked || isStreaming || isInsideLinked"
      :class="['workflow-info', {onlyStreaming: isStreaming && !isLinked}]"
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

    <Kanvas
      id="kanvas"
      ref="kanvas"
      @empty-pointerdown="onEmptyPointerDown"
    >
      <!-- Setting key to match exactly one workflow, causes knime-ui to re-render the whole component,
           instead of diffing old and new workflow -->
      <Workflow :key="`${workflow.projectId}-${activeWorkflowId}`" />
    </Kanvas>
  </div>
</template>

<style lang="postcss" scoped>
#kanvas >>> svg {
  color: var(--knime-masala);
}

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

    /* stylelint-disable-next-line no-descending-specificity */
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
