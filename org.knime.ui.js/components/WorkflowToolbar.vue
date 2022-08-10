<script>
import { mapState, mapGetters } from 'vuex';
import WorkflowBreadcrumb from '~/components/WorkflowBreadcrumb.vue';
import ZoomMenu from '~/components/ZoomMenu.vue';
import ToolbarCommandButton from '~/components/ToolbarCommandButton.vue';

/**
 * A toolbar shown on top of a workflow canvas. Contains action buttons and breadcrumb.
 */
export default {
    components: {
        WorkflowBreadcrumb,
        ZoomMenu,
        ToolbarCommandButton
    },
    computed: {
        ...mapState('workflow', { workflow: 'activeWorkflow' }),
        ...mapGetters('workflow', ['isWorkflowEmpty']),
        ...mapGetters('selection', ['selectedNodes']),
        hasBreadcrumb() {
            return this.workflow?.parents?.length > 0;
        },
        toolbarCommands() {
            const isInsideComponent = this.workflow?.info.containerType === 'component';
          
            if (!this.workflow) {
                return [];
            }
            let visibleItems = {
                // Always visible
                save: true,
                undo: true,
                redo: true,

                // Workflow
                executeAll: !this.selectedNodes.length,
                cancelAll: !this.selectedNodes.length,
                resetAll: !this.selectedNodes.length,

                // Node execution
                executeSelected: this.selectedNodes.length,
                cancelSelected: this.selectedNodes.length,
                resetSelected: this.selectedNodes.length,

                // Workflow abstraction
                createMetanode: this.selectedNodes.length,
                createComponent: this.selectedNodes.length,
                openLayoutEditor: isInsideComponent
            };

            return Object
                .entries(visibleItems)
                .filter(([name, visible]) => visible)
                .map(([name, visible]) => name);
        }
    }
};
</script>

<template>
  <div class="toolbar">
    <transition-group
      tag="div"
      name="button-list"
    >
      <!--
        setting :key="the list of all visible commands",
        re-renders the whole list in a new div whenever commands appear or disappear,
        such that those two lists can be faded
      -->
      <div
        :key="toolbarCommands.join()"
        class="button-list"
      >
        <ToolbarCommandButton
          v-for="command in toolbarCommands"
          :key="command"
          :name="command"
        />
      </div>
    </transition-group>

    <WorkflowBreadcrumb
      v-if="hasBreadcrumb"
      class="breadcrumb"
    />

    <ZoomMenu
      v-if="workflow"
      :disabled="isWorkflowEmpty"
      class="zoommenu"
    />
  </div>
</template>

<style lang="postcss" scoped>
.toolbar {
  display: flex;
  align-items: center;
  background: var(--knime-porcelain);
}

.button-list-leave-to,
.button-list-enter {
  opacity: 0;
}

.button-list-leave-active {
  position: absolute;
}

.button-list {
  transition: opacity 150ms ease-out;
  flex-shrink: 0;
  display: flex;
  font-size: 14px;
  user-select: none;
}

.breadcrumb {
  text-align: center;
  white-space: pre;
  flex: 1;
}
</style>
