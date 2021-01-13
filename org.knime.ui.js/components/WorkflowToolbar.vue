<script>
import { mapState, mapGetters } from 'vuex';
import WorkflowBreadcrumb from '~/components/WorkflowBreadcrumb';
import ToolbarButton from '~/components/ToolbarButton';
import ExecuteAllIcon from '~/assets/execute-all.svg?inline';
import CancelAllIcon from '~/assets/cancel-execution.svg?inline';
import ResetAllIcon from '~/assets/reset-all.svg?inline';
import FunctionButton from '~/webapps-common/ui/components/FunctionButton';
import DropdownIcon from '~/webapps-common/ui/assets/img/icons/arrow-dropdown.svg?inline';
import SubMenu from '~/webapps-common/ui/components/SubMenu';
import Button from '~/webapps-common/ui/components/Button';
import SplitButton from '~/webapps-common/ui/components/SplitButton';

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
        DropdownIcon,
        SubMenu
    },
    data() {
        return {
            zoomMenuOpen: false
        };
    },
    computed: {
        ...mapState('workflow', {
            workflow: 'activeWorkflow',
            allowedActions: state => state.activeWorkflow?.allowedActions || {}
        }),
        ...mapGetters('workflow', ['activeWorkflowId']),
        ...mapGetters('canvas', ['zoomFactor', 'fitToScreenZoomFactor']),
        hasBreadcrumb() {
            return this.workflow.parents?.length > 0;
        },
        zoomMenuItems() {
            return [
                {
                    text: 'Zoom to fit',
                    value: this.fitToScreenZoomFactor
                }, {
                    text: 'Zoom to 75%',
                    value: 0.75
                }, {
                    text: 'Zoom to 100%',
                    value: 1
                }, {
                    text: 'Zoom to 150%',
                    value: 1.5
                }
            ];
        }
    },
    mounted() {
        this.$watch('zoomFactor', this.formatZoomInput, { immediate: true });
    },
    methods: {
        formatZoomInput() {
            this.$refs.zoomInput.innerText = `${Math.round(this.zoomFactor * 100)}%`;
        },
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
        onZoomInputEnter(e) {
            console.log('enter pressed');
            
            let oldZoomFactor = this.zoomFactor;
            let newZoomFactor = parseInt(e.target.innerText, 10) / 100;
            
            if (!isNaN(newZoomFactor)) {
                this.$store.commit('canvas/setFactor', newZoomFactor);
            }
            
            if (this.zoomFactor === oldZoomFactor) {
                // zoom factor hasn't changed. Reset input field.
                this.formatZoomInput();
            }

            e.stopPropagation();
            e.preventDefault();
            e.target.blur();
        },
        onZoomInputClick(e) {
            e.target.focus();
            document.execCommand('selectAll', false, null);
            e.stopPropagation();
        },
        onZoomItemClick(e, item, id) {
            let newZoomFactor = item.value;
            this.$refs.zoomInput.blur();
            this.$store.commit('canvas/setFactor', newZoomFactor);
        },
        onZoomMenuToggle(e) {
            console.log('vlicked');
            this.$refs.zoomInput.blur();
        },
        onZoomInputFocusOut(e) {
            console.log('focus-lost');
            this.formatZoomInput();
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

    <SubMenu
      class="zoom"
      :items="zoomMenuItems"
      @item-click="onZoomItemClick"
      @click.capture="onZoomMenuToggle"
    >
      <div
        ref="zoomInput"
        class="zoom-input"
        contenteditable="true"
        @click="onZoomInputClick"
        @keydown.enter="onZoomInputEnter"
        @focusout.stop="onZoomInputFocusOut"
      />
      <DropdownIcon />
    </SubMenu>
  </div>
</template>

<style lang="postcss" scoped>
.toolbar {
  display: flex;
  align-items: center;
  background: var(--knime-porcelain);
  overflow: visible;
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

.zoom {
  margin-left: auto;

  & >>> .submenu-toggle {
    padding: 0 13px 0 0;
    align-items: center;

    & svg {
      height: 12px;
      width: 12px;
      stroke-width: calc(32px / 12);
      margin-bottom: 1px;
    }

    &.expanded svg {
      transform: scaleY(-1);
    }

    & .zoom-input {
      cursor: text;
      padding: 8px 4px 8px 16px;
      font-size: 14px;
      font-weight: 400;
      margin-right: 0;
    }
  }
}
</style>
