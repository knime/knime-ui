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

import commands from '~/commands';

/**
 * Creates the descriptor object of an action using the provided parameters.
 * It will use the `commandReference` parameter to query through the commands
 * registry and append to the title the associated hotkey binding of said command
 *
 * @param {String} payload.id Unique Id to assign to the action
 * @param {Boolean} payload.isEnabled Determines the enabled/disabled status of the action
 * @param {String} payload.title Value to use as a tooltip when action is hovered
 * @param {SVGComponent} payload.icon Icon component to be used by the action
 * @param {Function} payload.handler Click handler for the action
 * @param {String} payload.commandReference This value will be used to query in the commands registry
 * to find a matching entry to associate the action with
 *
 * @returns {Object} The action descriptor object
 */
const createAction = ({ id, isEnabled, title, icon, handler, commandReference = '' }) => {
    const command = commands[commandReference];
    
    return {
        id,
        title: command ? `${title} - ${command.hotkeyText}` : title,
        handler,
        icon,
        isEnabled
    };
};

/** Unique Ids of all the available actions that can be displayed */
const actionIds = {
    CONFIGURE_NODE: 'configureNode',
    PAUSE_NODE: 'pauseNode',
    RESUME_NODE: 'resumeNode',
    EXECUTE_NODE: 'executeNode',
    STEP: 'step',
    CANCEL: 'cancel',
    RESET: 'reset',
    OPEN_VIEW: 'openView'
};

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
        isSelfSelected() {
            return this.$store.getters['selection/singleSelectedNode']?.id === this.nodeId;
        },
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
            return [
                createAction({
                    id: actionIds.CONFIGURE_NODE,
                    title: 'Configure',
                    isEnabled: this.canOpenDialog,
                    icon: OpenDialogIcon,
                    handler: () => this.openDialog(this.nodeId),
                    commandReference: this.isSelfSelected && 'configureNode'
                }),
                createAction({
                    id: actionIds.PAUSE_NODE,
                    title: 'Pause',
                    isEnabled: true,
                    icon: PauseIcon,
                    handler: () => this.pauseLoopExecution(this.nodeId),
                    commandReference: this.isSelfSelected && 'pauseLoopExecution'
                }),
                createAction({
                    id: actionIds.RESUME_NODE,
                    title: 'Resume',
                    isEnabled: true,
                    icon: ResumeIcon,
                    handler: () => this.resumeLoopExecution(this.nodeId),
                    commandReference: this.isSelfSelected && 'resumeLoopExecution'
                }),
                createAction({
                    id: actionIds.EXECUTE_NODE,
                    title: 'Execute',
                    isEnabled: this.canExecute,
                    icon: ExecuteIcon,
                    handler: () => this.executeNodes([this.nodeId]),
                    commandReference: this.isSelfSelected && 'executeSelected'
                }),
                createAction({
                    id: actionIds.STEP,
                    title: 'Step',
                    isEnabled: this.canStep,
                    icon: StepIcon,
                    handler: () => this.stepLoopExecution(this.nodeId),
                    commandReference: this.isSelfSelected && 'stepLoopExecution'
                }),
                createAction({
                    id: actionIds.CANCEL,
                    title: 'Cancel',
                    isEnabled: this.canCancel,
                    icon: CancelIcon,
                    handler: () => this.cancelNodeExecution([this.nodeId]),
                    commandReference: this.isSelfSelected && 'cancelSelected'
                }),
                createAction({
                    id: actionIds.RESET,
                    title: 'Reset',
                    isEnabled: this.canReset,
                    icon: ResetIcon,
                    handler: () => this.resetNodes([this.nodeId]),
                    commandReference: this.isSelfSelected && 'resetSelected'
                }),
                createAction({
                    id: actionIds.OPEN_VIEW,
                    title: 'Open View',
                    isEnabled: this.canOpenView,
                    icon: OpenViewIcon,
                    handler: () => this.openView(this.nodeId),
                    commandReference: this.isSelfSelected && 'openView'
                })
            ];
        },
        visibleActions() {
            const conditionMap = {
                [actionIds.CONFIGURE_NODE]: this.canOpenDialog !== null,
                [actionIds.PAUSE_NODE]: this.canPause,
                [actionIds.RESUME_NODE]: !this.canPause && this.canResume,
                [actionIds.EXECUTE_NODE]: !this.canPause && !this.canResume,
                [actionIds.STEP]: this.canStep !== null,
                [actionIds.CANCEL]: true,
                [actionIds.RESET]: true,
                [actionIds.OPEN_VIEW]: this.canOpenView !== null
            };

            return this.actions.filter(({ id }) => conditionMap[id]);
        },
        /**
         *  returns the x-position of each button depending on the total amount of buttons
         *  @returns {Array<Number>} x-pos
         */
        positions() {
            const { nodeActionBarButtonSpread } = this.$shapes;
            let buttonCount = this.visibleActions.length;
            // spread buttons evenly around the horizontal center
            return this.actions.map((_, i) => (i + (1 - buttonCount) / 2) * nodeActionBarButtonSpread);
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
        ])
    }
};
</script>

<template>
  <g>
    <ActionButton
      v-for="({ id, isEnabled, icon, handler, title }, index) in visibleActions"
      :key="id"
      :class="`action-${id}`"
      :x="positions[index]"
      :disabled="!isEnabled"
      :title="title"
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
