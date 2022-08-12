import ExecuteAllIcon from '~/assets/execute-all.svg';
import CancelAllIcon from '~/assets/cancel.svg';
import ResetAllIcon from '~/assets/reset-all.svg';

import ExecuteSelectedIcon from '~/assets/execute-selected.svg';
import CancelSelectedIcon from '~/assets/cancel-selected.svg';
import ResetSelectedIcon from '~/assets/reset-selected.svg';

import ResumeLoopIcon from '~/assets/resume-execution.svg';
import PauseLoopIcon from '~/assets/pause-execution.svg';
import StepLoopIcon from '~/assets/step-execution.svg';

export default {
    executeAll: {
        text: 'Execute all',
        title: 'Execute workflow',
        hotkey: ['Shift', 'F7'],
        icon: ExecuteAllIcon,
        execute:
            ({ $store }) => $store.dispatch('workflow/executeNodes', 'all'),
        condition:
            ({ $store }) => $store.state.workflow.activeWorkflow?.allowedActions.canExecute
    },
    cancelAll: {
        text: 'Cancel all',
        title: 'Cancel workflow execution',
        hotkey: ['Shift', 'F9'],
        icon: CancelAllIcon,
        execute:
            ({ $store }) => $store.dispatch('workflow/cancelNodeExecution', 'all'),
        condition:
            ({ $store }) => $store.state.workflow.activeWorkflow?.allowedActions.canCancel
    },
    resetAll: {
        text: 'Reset all',
        title: 'Reset executed nodes',
        hotkey: ['Shift', 'F8'],
        icon: ResetAllIcon,
        execute:
            ({ $store }) => $store.dispatch('workflow/resetNodes', 'all'),
        condition:
            ({ $store }) => $store.state.workflow.activeWorkflow?.allowedActions.canReset
    },

    // selected nodes (multiple)
    executeSelected: {
        text: 'Execute',
        title: 'Execute selected nodes',
        hotkey: ['F7'],
        icon: ExecuteSelectedIcon,
        execute:
            ({ $store }) => $store.dispatch('workflow/executeNodes', 'selected'),
        condition:
            ({ $store }) => $store.getters['selection/selectedNodes'].some(node => node.allowedActions.canExecute)
    },
    cancelSelected: {
        text: 'Cancel',
        title: 'Cancel selected nodes',
        hotkey: ['F9'],
        icon: CancelSelectedIcon,
        execute:
            ({ $store }) => $store.dispatch('workflow/cancelNodeExecution', 'selected'),
        condition:
            ({ $store }) => $store.getters['selection/selectedNodes'].some(node => node.allowedActions.canCancel)
    },
    resetSelected: {
        text: 'Reset',
        title: 'Reset selected nodes',
        hotkey: ['F8'],
        icon: ResetSelectedIcon,
        execute:
            ({ $store }) => $store.dispatch('workflow/resetNodes', 'selected'),
        condition:
            ({ $store }) => $store.getters['selection/selectedNodes'].some(node => node.allowedActions.canReset)
    },

    // single node
    resumeLoopExecution: {
        text: 'Resume loop',
        title: 'Resume loop execution',
        hotkey: ['Ctrl', 'Alt', 'F8'],
        icon: ResumeLoopIcon,
        execute:
            ({ $store }) => $store.dispatch('workflow/resumeLoopExecution',
                $store.getters['selection/singleSelectedNode'].id),
        condition:
            ({ $store }) => $store.getters['selection/singleSelectedNode']?.loopInfo?.allowedActions?.canResume
    },
    pauseLoopExecution: {
        text: 'Pause loop',
        title: 'Pause loop execution',
        hotkey: ['Ctrl', 'Alt', 'F7'],
        icon: PauseLoopIcon,
        execute:
            ({ $store }) => $store.dispatch('workflow/pauseLoopExecution',
                $store.getters['selection/singleSelectedNode'].id),
        condition:
            ({ $store }) => $store.getters['selection/singleSelectedNode']?.loopInfo?.allowedActions?.canPause
    },
    stepLoopExecution: {
        text: 'Step loop',
        title: 'Execute one loop step',
        hotkey: ['Ctrl', 'Alt', 'F6'],
        icon: StepLoopIcon,
        execute:
            ({ $store }) => $store.dispatch('workflow/stepLoopExecution',
                $store.getters['selection/singleSelectedNode'].id),
        condition:
            ({ $store }) => $store.getters['selection/singleSelectedNode']?.loopInfo?.allowedActions?.canStep
    }
};
