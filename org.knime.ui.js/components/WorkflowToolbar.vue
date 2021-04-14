<script>
import { mapState, mapGetters, mapActions } from 'vuex';
import WorkflowBreadcrumb from '~/components/WorkflowBreadcrumb';
import ToolbarButton from '~/components/ToolbarButton';
import ExecuteAllIcon from '~/assets/execute-all.svg?inline';
import CancelAllIcon from '~/assets/cancel-execution.svg?inline';
import ResetAllIcon from '~/assets/reset-all.svg?inline';
import ExecuteSelectedIcon from '~/assets/execute-selected.svg?inline';
import CancelSelectedIcon from '~/assets/cancel-selected.svg?inline';
import ResetSelectedIcon from '~/assets/reset-selected.svg?inline';
import RedoIcon from '~/assets/redo.svg?inline';
import UndoIcon from '~/assets/undo.svg?inline';
import DeleteIcon from '~/assets/delete.svg?inline';
import ZoomMenu from '~/components/ZoomMenu';

/**
 * A toolbar shown on top of a workflow canvas. Contains action buttons and breadcrumb.
 */
export default {
    components: {
        WorkflowBreadcrumb,
        ToolbarButton,
        ExecuteAllIcon,
        CancelAllIcon,
        ResetAllIcon,
        ExecuteSelectedIcon,
        CancelSelectedIcon,
        ResetSelectedIcon,
        UndoIcon,
        RedoIcon,
        DeleteIcon,
        ZoomMenu
    },
    computed: {
        ...mapState('workflow', {
            workflow: 'activeWorkflow',
            allowedActions: state => state.activeWorkflow?.allowedActions || {}
        }),
        ...mapGetters('selection', ['selectedNodes', 'selectedConnections']),
        hasBreadcrumb() {
            return this.workflow.parents?.length > 0;
        },
        hasSelection() {
            return this.selectedNodes().length > 0;
        },
        canExecuteSelection() {
            return this.selectedNodes().some(node => node.allowedActions.canExecute);
        },
        canCancelSelection() {
            return this.selectedNodes().some(node => node.allowedActions.canCancel);
        },
        canResetSelection() {
            return this.selectedNodes().some(node => node.allowedActions.canReset);
        },
        canDeleteSelection() {
            return this.selectedNodes.some(node => node.allowedActions.canDelete) ||
              this.selectedConnections.some(connection => connection.canDelete);
        },
        // Checks if the application is run on a mac
        isMac() {
            return navigator.userAgent.toLowerCase().includes('mac');
        }
    },
    methods: {
        ...mapActions('workflow', ['executeNodes', 'cancelNodeExecution', 'resetNodes', 'deleteSelectedObjects',
            'undo', 'redo']),
        ...mapActions('selection', ['deselectAllObjects']),
        /**
         * Translates windows/linux shortcuts into mac shortcuts when operating system is mac
         * @param {String} shortcutTitle the windows/linux compatible shortcuts
         * @returns {String} the translated string
         */
        checkForMacShortcuts(shortcutTitle) {
            if (this.isMac) {
                shortcutTitle = shortcutTitle.replace('Shift +', '⇧');
                shortcutTitle = shortcutTitle.replace('– Delete', '– ⌫');
                return shortcutTitle.replace('Ctrl + ', '⌘ ');
            } else {
                return  shortcutTitle;
            }
        },
        // deletes all the selected nodes and connectors
        deleteSelection() {
            this.$store.dispatch('workflow/deleteSelectedObjects', {
                selectedNodes: this.selectedNodes,
                selectedConnections: this.selectedConnections
            });
            this.deselectAllObjects();
        }
    }
};
</script>

<template>
  <div class="toolbar">
    <div class="buttons">
      <ToolbarButton
        :disabled="!allowedActions.canUndo"
        :title="checkForMacShortcuts('Undo – Ctrl + Z')"
        @click.native="undo"
      >
        <UndoIcon />
      </ToolbarButton>
      <ToolbarButton
        :disabled="!allowedActions.canRedo"
        :title="checkForMacShortcuts('Redo - Ctrl + Shift + Z')"
        @click.native="redo"
      >
        <RedoIcon />
      </ToolbarButton>
      <template v-if="!hasSelection">
        <ToolbarButton
          class="with-text"
          :disabled="!allowedActions.canExecute"
          :title="checkForMacShortcuts('Execute workflow – Shift + F7')"
          @click.native="executeNodes('all')"
        >
          <ExecuteAllIcon />
          Execute all
        </ToolbarButton>
        <ToolbarButton
          class="with-text"
          :disabled="!allowedActions.canCancel"
          :title="checkForMacShortcuts('Cancel workflow execution – Shift + F9')"
          @click.native="cancelNodeExecution('all')"
        >
          <CancelAllIcon />
          Cancel all
        </ToolbarButton>
        <ToolbarButton
          class="with-text"
          :disabled="!allowedActions.canReset"
          :title="checkForMacShortcuts('Reset executed nodes – Shift + F8')"
          @click.native="resetNodes('all')"
        >
          <ResetAllIcon />
          Reset all
        </ToolbarButton>
      </template>
      <template v-else>
        <ToolbarButton
          class="with-text"
          :disabled="!canExecuteSelection"
          :title="checkForMacShortcuts('Execute selected nodes – F7')"
          @click.native="executeNodes('selected')"
        >
          <ExecuteSelectedIcon />
          Execute
        </ToolbarButton>
        <ToolbarButton
          class="with-text"
          :disabled="!canCancelSelection"
          :title="checkForMacShortcuts('Cancel selected nodes – F9')"
          @click.native="cancelNodeExecution('selected')"
        >
          <CancelSelectedIcon />
          Cancel
        </ToolbarButton>
        <ToolbarButton
          class="with-text"
          :disabled="!canResetSelection"
          :title="checkForMacShortcuts('Reset selected nodes – F8')"
          @click.native="resetNodes('selected')"
        >
          <ResetSelectedIcon />
          Reset
        </ToolbarButton>
      </template>
      <ToolbarButton
        class="with-text"
        :disabled="!canDeleteSelection"
        :title="checkForMacShortcuts('Delete selection – Delete')"
        @click.native="deleteSelection"
      >
        <DeleteIcon />
        Delete
      </ToolbarButton>
    </div>

    <WorkflowBreadcrumb
      v-if="hasBreadcrumb"
      class="breadcrumb"
    />

    <ZoomMenu class="zoommenu" />
  </div>
</template>

<style lang="postcss" scoped>
.toolbar {
  display: flex;
  align-items: center;
  background: var(--knime-porcelain);
}

.buttons {
  flex-shrink: 0;
  display: flex;
  font-size: 14px;

  & .with-text {
    padding-right: 9px;
    padding-left: 2px;
  }
}

.breadcrumb {
  text-align: center;
  white-space: pre;
  flex: 1;
}
</style>
