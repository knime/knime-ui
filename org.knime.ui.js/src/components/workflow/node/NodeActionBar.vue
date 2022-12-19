<script>
import { mapActions, mapGetters } from 'vuex';

import ExecuteIcon from '@/assets/execute.svg';
import ResumeIcon from '@/assets/resume-execution.svg';
import ResetIcon from '@/assets/reset-all.svg';
import CancelIcon from '@/assets/cancel.svg';
import PauseIcon from '@/assets/pause-execution.svg';
import StepIcon from '@/assets/step-execution.svg';
import OpenViewIcon from '@/assets/open-view.svg';
import OpenDialogIcon from '@/assets/configure-node.svg';

import ActionBar from '@/components/common/ActionBar.vue';

/**
 *  Displays a bar of action buttons above nodes
 *  Emits Event `action(actionName)`
 */
export default {
    components: {
        ActionBar
    },
    props: {
        nodeId: {
            type: String,
            default: 'NODE ID MISSING'
        },
        canExecute: {
            type: Boolean,
            default: false
        },
        canCancel: {
            type: Boolean,
            default: false
        },
        canReset: {
            type: Boolean,
            default: false
        },
        /*
         * The props below can either be true, false or unset.
         * In case they are unset, Vue defaults them to null
         */
        canStep: {
            type: Boolean,
            default: null
        },
        canPause: {
            type: Boolean,
            default: null
        },
        canResume: {
            type: Boolean,
            default: null
        },
        canOpenView: {
            type: Boolean,
            default: null
        },
        canOpenDialog: {
            type: Boolean,
            default: null
        }
    },
    computed: {
        ...mapGetters('selection', ['isNodeSelected']),
        // all possible actions
        actions() {
            return {
                configureNode: {
                    title: () => this.hoverTitle('Configure', this.$shortcuts.get('configureNode').hotkeyText),
                    isEnabled: this.canOpenDialog,
                    icon: OpenDialogIcon,
                    onClick: () => this.openNodeConfiguration(this.nodeId)
                },
                pauseLoopExecution: {
                    title: () => this.hoverTitle('Pause', this.$shortcuts.get('pauseLoopExecution').hotkeyText),
                    isEnabled: true,
                    icon: PauseIcon,
                    onClick: () => this.pauseLoopExecution(this.nodeId)
                },
                resumeLoopExecution: {
                    title: () => this.hoverTitle('Resume', this.$shortcuts.get('resumeLoopExecution').hotkeyText),
                    isEnabled: true,
                    icon: ResumeIcon,
                    onClick: () => this.resumeLoopExecution(this.nodeId)
                },
                execute: {
                    title: () => this.hoverTitle('Execute', this.$shortcuts.get('executeSelected').hotkeyText),
                    isEnabled: this.canExecute,
                    icon: ExecuteIcon,
                    onClick: () => this.executeNodes([this.nodeId])
                },
                stepLoopExecution: {
                    title: () => this.hoverTitle('Step', this.$shortcuts.get('stepLoopExecution').hotkeyText),
                    isEnabled: this.canStep,
                    icon: StepIcon,
                    onClick: () => this.stepLoopExecution(this.nodeId)
                },
                cancelExecution: {
                    title: () => this.hoverTitle('Cancel', this.$shortcuts.get('cancelSelected').hotkeyText),
                    isEnabled: this.canCancel,
                    icon: CancelIcon,
                    onClick: () => this.cancelNodeExecution([this.nodeId])
                },
                reset: {
                    title: () => this.hoverTitle('Reset', this.$shortcuts.get('resetSelected').hotkeyText),
                    isEnabled: this.canReset,
                    icon: ResetIcon,
                    onClick: () => this.resetNodes([this.nodeId])
                },
                openView: {
                    title: () => this.hoverTitle('Open View', this.$shortcuts.get('openView').hotkeyText),
                    isEnabled: this.canOpenView,
                    icon: OpenViewIcon,
                    onClick: () => this.openView(this.nodeId)
                }
            };
        },
        visibleActions() {
            const conditionMap = {
                configureNode: this.canOpenDialog !== null,

                // plain execution
                execute: !this.canPause && !this.canResume,
                
                // loop execution
                pauseLoopExecution: this.canPause,
                resumeLoopExecution: !this.canPause && this.canResume,
                stepLoopExecution: this.canStep !== null,

                cancelExecution: true,
                reset: true,

                // other
                openView: this.canOpenView !== null
            };

            return Object.entries(conditionMap)
                .filter(([name, visible]) => visible)
                .map(([name, visible]) => this.actions[name]);
        }
    },
    methods: {
        ...mapActions('workflow', [
            'executeNodes',
            'cancelNodeExecution',
            'resetNodes',
            'pauseLoopExecution',
            'resumeLoopExecution',
            'stepLoopExecution',
            'openView',
            'openNodeConfiguration'
        ]),
        /*
         * If this node is selected, hoverTitle appends the hotkey to the title
         * otherwise the title is returned
         */
        hoverTitle(title, hotkeyText) {
            return this.isNodeSelected(this.nodeId) && hotkeyText
                ? `${title} - ${hotkeyText}`
                : title;
        }
    }
};
</script>

<template>
  <g>
    <ActionBar :actions="visibleActions" />

    <text
      class="node-id"
      text-anchor="middle"
      :y="-$shapes.nodeIdMargin"
    >
      {{ nodeId }}
    </text>
  </g>
</template>

<style scoped>
.node-id {
  font: normal 10px "Roboto Condensed", sans-serif;
  pointer-events: none;
}
</style>
