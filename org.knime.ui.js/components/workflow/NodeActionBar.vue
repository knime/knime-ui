<script>
import { mapActions } from 'vuex';

import ExecuteIcon from '~/assets/execute.svg?inline';
import ResumeIcon from '~/assets/resume-execution.svg?inline';
import ResetIcon from '~/assets/reset-all.svg?inline';
import CancelIcon from '~/assets/cancel-execution.svg?inline';
import PauseIcon from '~/assets/pause-execution.svg?inline';
import StepIcon from '~/assets/step-execution.svg?inline';
import OpenViewIcon from '~/assets/open-view.svg?inline';
import OpenDialogIcon from '~/assets/configure-node.svg?inline';

import ActionButton from '~/components/workflow/ActionButton';

/**
 *  Displays a bar of action buttons above nodes
 *  Emits Event `action(actionName)`
 */
export default {
    components: {
        ActionButton
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
        /**
         *  returns an array of allowed actions with the corresponding api call,
         *  a boolean if it is enabled or disabled and an icon. openDialog and openView are only added when the prop is available
         *  @returns {Array<Array>} Array of allowed actions
         */
        actions() {
            let actions = [];

            if (this.canOpenDialog !== null) {
                actions.push(['openDialog', this.canOpenDialog, OpenDialogIcon, () => this.openDialog(this.nodeId)]);
            }

            if (this.canPause) {
                actions.push(['pause', true, PauseIcon, () => this.pauseNodeExecution(this.nodeId)]);
            } else if (this.canResume) {
                actions.push(['resume', true, ResumeIcon, () => this.resumeNodeExecution(this.nodeId)]);
            } else {
                actions.push(['execute', this.canExecute, ExecuteIcon, () => this.executeNodes([this.nodeId])]);
            }

            if (this.canStep !== null) {
                actions.push(['step', this.canStep, StepIcon, () => this.stepNodeExecution(this.nodeId)]);
            }

            actions.push(
                ['cancel', this.canCancel, CancelIcon, () => this.cancelNodeExecution([this.nodeId])],
                ['reset', this.canReset, ResetIcon, () => this.resetNodes([this.nodeId])]
            );

            if (this.canOpenView !== null) {
                actions.push(['openView', this.canOpenView, OpenViewIcon, () => this.openView(this.nodeId)]);
            }
            return actions;
        },
        /**
         *  returns the x-position of each button depending on the total amount of buttons
         *  @returns {Array<Number>} x-pos
         */
        positions() {
            const { nodeActionBarButtonSpread } = this.$shapes;
            let buttonCount = this.actions.length;
            // spread buttons evenly around the horizontal center
            return this.actions.map((_, i) => (i + (1 - buttonCount) / 2) * nodeActionBarButtonSpread);
        }
    },

    methods: {
        ...mapActions('workflow', ['executeNodes', 'cancelNodeExecution', 'resetNodes',
            'pauseNodeExecution', 'resumeNodeExecution', 'stepNodeExecution', 'openView', 'openDialog'])
    }
};
</script>

<template>
  <g>
    <ActionButton
      v-for="([action, enabled, icon, method], index) in actions"
      :key="action"
      :class="`action-${action}`"
      :x="positions[index]"
      :disabled="!enabled"
      @click="method"
    >
      <Component :is="icon" />
    </ActionButton>

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
