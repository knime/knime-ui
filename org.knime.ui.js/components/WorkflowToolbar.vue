<script>
import { mapState, mapGetters } from 'vuex';
import WorkflowBreadcrumb from '~/components/WorkflowBreadcrumb';
import ToolbarButton from '~/components/ToolbarButton';
import { executeNodes, cancelNodeExecution, resetNodes } from '~api';
import ExecuteAllIcon from '~/assets/execute-all.svg?inline';
import CancelAllIcon from '~/assets/cancel-execution.svg?inline';
import ResetAllIcon from '~/webapps-common/ui/assets/img/icons/cogs.svg?inline'; // TODO: use correct icon NXT-113

export default {
    components: {
        WorkflowBreadcrumb,
        ToolbarButton,
        ExecuteAllIcon,
        CancelAllIcon,
        ResetAllIcon
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
            executeNodes({ projectId: this.workflow.projectId, nodeIds: [this.activeWorkflowId] });
        },
        onCancelBtnClick() {
            cancelNodeExecution({ projectId: this.workflow.projectId, nodeIds: [this.activeWorkflowId] });
        },
        onResetBtnClick() {
            resetNodes({ projectId: this.workflow.projectId, nodeIds: [this.activeWorkflowId] });
        }
    }
};
</script>

<template>
  <div class="toolbar">
    <div class="buttons">
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
  </div>
</template>

<style lang="postcss" scoped>
.toolbar {
  display: flex;
  align-items: center;
  background: var(--knime-porcelain);
  overflow: hidden;
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
