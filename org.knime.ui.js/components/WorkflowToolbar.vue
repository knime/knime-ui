<script>
import { mapState, mapGetters } from 'vuex';
import WorkflowBreadcrumb from '~/components/WorkflowBreadcrumb';
import ToolbarButton from '~/components/ToolbarButton';
import ExecuteAllIcon from '~/assets/execute-all.svg?inline';
import CancelAllIcon from '~/assets/cancel-execution.svg?inline';
import ResetAllIcon from '~/assets/reset-all.svg?inline';
import RedoIcon from '~/assets/redo.svg?inline';
import UndoIcon from '~/assets/undo.svg?inline';
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
        ZoomMenu
    },
    computed: {
        ...mapState('workflow', {
            workflow: 'activeWorkflow',
            allowedActions: state => state.activeWorkflow?.allowedActions || {}
        }),
        ...mapGetters('workflow', ['activeWorkflowId']),
        hasBreadcrumb() {
            return this.workflow.parents?.length > 0;
        }
    },
    methods: {
        onExecuteBtnClick() {
            this.$store.dispatch('workflow/executeNodes', {
                nodeIds: [this.activeWorkflowId]
            });
        },
        onCancelBtnClick() {
            this.$store.dispatch('workflow/cancelNodeExecution', {
                nodeIds: [this.activeWorkflowId]
            });
        },
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
      <ToolbarButton
        :disabled="!allowedActions.canExecute"
        title="Execute workflow"
        @click.native="onExecuteBtnClick"
      >
        <ExecuteAllIcon />
      </ToolbarButton>
      <ToolbarButton
        :disabled="!allowedActions.canCancel"
        title="Cancel workflow execution"
        @click.native="onCancelBtnClick"
      >
        <CancelAllIcon />
      </ToolbarButton>
      <ToolbarButton
        :disabled="!allowedActions.canReset"
        title="Reset executed nodes"
        @click.native="onResetBtnClick"
      >
        <ResetAllIcon />
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
}

.breadcrumb {
  text-align: center;
  white-space: pre;
  flex: 1;
}
</style>
