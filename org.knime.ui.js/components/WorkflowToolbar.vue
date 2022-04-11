<script>
import { mapState, mapGetters } from 'vuex';
import WorkflowBreadcrumb from '~/components/WorkflowBreadcrumb';
import ZoomMenu from '~/components/ZoomMenu';
import ToolbarCommandButton from '~/components/ToolbarCommandButton';

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
        hasBreadcrumb() {
            return this.workflow?.parents?.length > 0;
        },
        toolbarCommands() {
            if (!this.workflow) {
                return [];
            }

            const selectedNodes = this.$store.getters['selection/selectedNodes'];
            const selectedConnections = this.$store.getters['selection/selectedConnections'];
            const somethingSelected = selectedNodes.length || selectedConnections.length;
            
            let visibleItems = {
                // always visible
                save: true,
                undo: true,
                redo: true,

                // Workflow
                executeAll: !selectedNodes.length,
                cancelAll: !selectedNodes.length,
                resetAll: !selectedNodes.length,

                // Node Execution
                executeSelected: selectedNodes.length,
                cancelSelected: selectedNodes.length,
                resetSelected: selectedNodes.length,
                // Something selected
                deleteSelected: somethingSelected,

                createMetanode: selectedNodes.length

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
