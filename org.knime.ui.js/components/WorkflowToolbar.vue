<script>
import { mapState, mapGetters, mapActions } from 'vuex';
import WorkflowBreadcrumb from '~/components/WorkflowBreadcrumb';
import ToolbarButton from '~/components/ToolbarButton';
import ExecuteAllIcon from '~/assets/execute-all.svg?inline';
import CancelAllIcon from '~/assets/cancel-execution.svg?inline';
import ResetAllIcon from '~/assets/reset-all.svg?inline';
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
        ...mapGetters('workflow', ['selectedNodes']),
        hasBreadcrumb() {
            return this.workflow.parents?.length > 0;
        },
        hasSelection() {
            return this.selectedNodes.length > 0;
        },
        canExecuteSelection() {
            return this.selectedNodes.some(node => node.allowedActions.canExecute);
        },
        canCancelSelection() {
            return this.selectedNodes.some(node => node.allowedActions.canCancel);
        },
        canResetSelection() {
            return this.selectedNodes.some(node => node.allowedActions.canReset);
        },
        canDeleteSelection() {
            return this.selectedNodes.some(node => node.allowedActions.canDelete);
        }
    },
    methods: {
        ...mapActions('workflow', ['executeNodes', 'cancelNodeExecution', 'resetNodes', 'deleteSelectedNodes']),
        onResetBtnClick() {
            this.$store.dispatch('workflow/resetNodes', {
                nodeIds: [this.activeWorkflowId]
            });
        },
        onUndoBtnClick() {
            this.$store.dispatch('workflow/undo');
        },
        onRedoBtnClick() {
            this.$store.dispatch('workflow/redo');
        }
    }
};
</script>

<template>
  <div class="toolbar">
    <div class="buttons">
      <template v-if="!hasSelection">
        <ToolbarButton
          class="with-text"
          :disabled="!allowedActions.canExecute"
          title="Execute workflow – Shift + F7"
          @click.native="executeNodes('all')"
        >
          <ExecuteAllIcon />
          Execute all
        </ToolbarButton>
        <ToolbarButton
          class="with-text"
          :disabled="!allowedActions.canCancel"
          title="Cancel workflow execution – Shift + F9"
          @click.native="cancelNodeExecution('all')"
        >
          <CancelAllIcon />
          Cancel all
        </ToolbarButton>
        <ToolbarButton
          class="with-text"
          :disabled="!allowedActions.canReset"
          title="Reset executed nodes – Shift + F8"
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
          title="Execute selected nodes – F7"
          @click.native="executeNodes('selected')"
        >
          <ExecuteAllIcon />
          Execute selected
        </ToolbarButton>
        <ToolbarButton
          class="with-text"
          :disabled="!canCancelSelection"
          title="Cancel selected nodes – F9"
          @click.native="cancelNodeExecution('selected')"
        >
          <CancelAllIcon />
          Cancel selected
        </ToolbarButton>
        <ToolbarButton
          class="with-text"
          :disabled="!canResetSelection"
          title="Reset selected nodes – F8"
          @click.native="resetNodes('selected')"
        >
          <ResetAllIcon />
          Reset selected
        </ToolbarButton>
      </template>
      <ToolbarButton
        class="with-text"
        :disabled="!canDeleteSelection"
        title="Delete selection – Delete"
        @click.native="deleteSelectedNodes"
      >
        <DeleteIcon />
        Delete
      </ToolbarButton>
      <ToolbarButton
        :disabled="!allowedActions.canUndo"
        title="Undo"
        @click.native="onUndoBtnClick"
      >
        <UndoIcon />
      </ToolbarButton>
      <ToolbarButton
        :disabled="!allowedActions.canRedo"
        title="Redo"
        @click.native="onRedoBtnClick"
      >
        <RedoIcon />
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
