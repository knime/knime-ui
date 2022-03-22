<script>
import { mapActions, mapGetters } from 'vuex';

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
        /**
         *  returns an array of allowed actions with a handler to the corresponding api call,
         *  a boolean if it is enabled or disabled, an icon and the title (tooltip on hover).
         *
         *  `openDialog` and `openView` are only added when the prop is available
         *
         *  @returns {Array<Array>} Array of allowed actions
         */
        actions() {
            // For all the actions, the command reference property will only be set if THIS node is selected
            // as the hotkey in the title only makes sense for selected nodes
            return {
                configureNode: {
                    title: 'Configure',
                    isEnabled: this.canOpenDialog,
                    icon: OpenDialogIcon,
                    handler: () => this.openDialog(this.nodeId),
                    hotkeyText: this.$commands.get('configureNode').hotkeyText
                },
                pauseLoopExecution: {
                    title: 'Pause',
                    isEnabled: true,
                    icon: PauseIcon,
                    handler: () => this.pauseLoopExecution(this.nodeId),
                    hotkeyText: this.$commands.get('pauseLoopExecution').hotkeyText
                },
                resumeLoopExecution: {
                    title: 'Resume',
                    isEnabled: true,
                    icon: ResumeIcon,
                    handler: () => this.resumeLoopExecution(this.nodeId),
                    hotkeyText: this.$commands.get('resumeLoopExecution').hotkeyText
                },
                execute: {
                    title: 'Execute',
                    isEnabled: this.canExecute,
                    icon: ExecuteIcon,
                    handler: () => this.executeNodes([this.nodeId]),
                    hotkeyText: this.$commands.get('executeSelected').hotkeyText
                },
                stepLoopExecution: {
                    title: 'Step',
                    isEnabled: this.canStep,
                    icon: StepIcon,
                    handler: () => this.stepLoopExecution(this.nodeId),
                    hotkeyText: this.$commands.get('stepLoopExecution').hotkeyText
                },
                cancelExecution: {
                    title: 'Cancel',
                    isEnabled: this.canCancel,
                    icon: CancelIcon,
                    handler: () => this.cancelNodeExecution([this.nodeId]),
                    hotkeyText: this.$commands.get('cancelSelected').hotkeyText
                },
                reset: {
                    title: 'Reset',
                    isEnabled: this.canReset,
                    icon: ResetIcon,
                    handler: () => this.resetNodes([this.nodeId]),
                    hotkeyText: this.$commands.get('resetSelected').hotkeyText
                },
                openView: {
                    title: 'Open View',
                    isEnabled: this.canOpenView,
                    icon: OpenViewIcon,
                    handler: () => this.openView(this.nodeId),
                    hotkeyText: this.$commands.get('openView').hotkeyText
                }
            };
        },
        visibleActions() {
            const conditionMap = {
                // plain execution
                execute: !this.canPause && !this.canResume,
                cancelExecution: true,
                reset: true,

                // loop execution
                pauseLoopExecution: this.canPause,
                resumeLoopExecution: !this.canPause && this.canResume,
                stepLoopExecution: this.canStep !== null,

                // other
                configureNode: this.canOpenDialog !== null,
                openView: this.canOpenView !== null
            };

            return Object.entries(conditionMap)
                .filter(([name, visible]) => visible)
                .map(([name, visible]) => this.actions[name]);
        },
        /**
         *  returns the x-position of each button depending on the total amount of buttons
         *  @returns {Array<Number>} x-pos
         */
        positions() {
            const { nodeActionBarButtonSpread } = this.$shapes;
            let buttonCount = this.visibleActions.length;

            // spread buttons evenly around the horizontal center
            return this.visibleActions.map((_, i) => (i + (1 - buttonCount) / 2) * nodeActionBarButtonSpread);
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
            'openDialog'
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
    <ActionButton
      v-for="({ isEnabled, icon, handler, title, hotkeyText }, index) in visibleActions"
      :key="title"
      :x="positions[index]"
      :disabled="!isEnabled"
      :title="hoverTitle(title, hotkeyText)"
      @click="handler"
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
