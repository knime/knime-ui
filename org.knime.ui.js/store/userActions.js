import ExecuteAllIcon from '~/assets/execute-all.svg?inline';
import CancelAllIcon from '~/assets/cancel-execution.svg?inline';
import ResetAllIcon from '~/assets/reset-all.svg?inline';
import DeleteIcon from '~/assets/delete.svg?inline';

/**
 * All hotkeys we want to use for actions. Look in HotKeys.vue for the global handling
 */
const hotKeys = {
    zoomToFit: ['Ctrl', '1'],
    selectAllNodes: ['Ctrl', 'A'],
    executeAllNodes: ['Shift', 'F7'],
    cancelAllNodes: ['Shift', 'F9'],
    resetAllNodes: ['Shift', 'F8'],
    executeSelectedNodes: ['F7'],
    resetSelectedNodes: ['F8'],
    cancelSelectedNodes: ['F9'],
    deleteBackspace: ['BACKSPACE'],
    deleteDel: ['DELETE']
};

/**
 * Mapping of key names to symbols (or shorter display names)
 */
const hotKeyDisplayMap = {
    Shift: '⇧',
    BACKSPACE: '⌫',
    DELETE: 'DEL'
};

const actionItemsList = [{
    text: 'Execute all',
    title: 'Execute workflow',
    hotkey: hotKeys.executeAllNodes,
    icon: ExecuteAllIcon,
    storeAction: 'workflow/executeNodes',
    storeActionParams: ['all'],
    menuBar: {
        isDisabled: ({ allowedWorkflowActions }) => !allowedWorkflowActions.canExecute,
        isVisible: ({ selectedNodes }) => selectedNodes.length === 0
    }
}, {
    text: 'Cancel all',
    title: 'Cancel workflow execution',
    hotkey: hotKeys.cancelAllNodes,
    icon: CancelAllIcon,
    storeAction: 'workflow/cancelNodeExecution',
    storeActionParams: ['all'],
    menuBar: {
        isDisabled: ({ allowedWorkflowActions }) => !allowedWorkflowActions.canCancel,
        isVisible: ({ selectedNodes }) => selectedNodes.length === 0
    }
}, {
    text: 'Reset all',
    title: 'Reset executed nodes',
    hotkey: hotKeys.resetAllNodes,
    icon: ResetAllIcon,
    storeAction: 'workflow/resetNodes',
    storeActionParams: ['all'],
    menuBar: {
        isDisabled: ({ allowedWorkflowActions }) => !allowedWorkflowActions.canReset,
        isVisible: ({ selectedNodes }) => selectedNodes.length === 0
    }
}, {
    text: 'Execute',
    title: 'Execute selected nodes',
    hotkey: hotKeys.executeSelectedNodes,
    icon: ExecuteAllIcon,
    storeAction: 'workflow/executeNodes',
    storeActionParams: ['selected'],
    menuBar: {
        isDisabled: ({ selectedNodes }) => !selectedNodes.some(node => node.allowedActions.canExecute),
        isVisible: ({ selectedNodes }) => selectedNodes.length > 0
    }
}, {
    text: 'Cancel',
    title: 'Cancel selected nodes',
    hotkey: hotKeys.cancelSelectedNodes,
    icon: CancelAllIcon,
    storeAction: 'workflow/cancelNodeExecution',
    storeActionParams: ['selected'],
    menuBar: {
        isDisabled: ({ selectedNodes }) => !selectedNodes.some(node => node.allowedActions.canCancel),
        isVisible: ({ selectedNodes }) => selectedNodes.length > 0
    }
}, {
    text: 'Reset',
    title: 'Reset selected nodes',
    hotkey: hotKeys.resetSelectedNodes,
    icon: ResetAllIcon,
    storeAction: 'workflow/resetNodes',
    storeActionParams: ['selected'],
    menuBar: {
        isDisabled: ({ selectedNodes }) => !selectedNodes.some(node => node.allowedActions.canReset),
        isVisible: ({ selectedNodes }) => selectedNodes.length > 0
    }
}, {
    text: 'Delete',
    title: 'Delete selection',
    hotkey: hotKeys.deleteBackspace,
    hotkey2: hotKeys.deleteDel,
    icon: DeleteIcon,
    storeAction: 'workflow/deleteSelectedNodes',
    storeActionParams: [],
    menuBar: {
        isDisabled: ({ selectedNodes }) => !selectedNodes.some(node => node.allowedActions.canDelete),
        isVisible: ({ selectedNodes }) => selectedNodes.length > 0
    }
}];

export const getters = {
    actionItems(state, getters, rootState, rootGetters) {
        const selectedNodes = rootGetters['workflow/selectedNodes'];
        const allowedWorkflowActions = rootState.workflow.activeWorkflow?.allowedActions || {};

        return actionItemsList.map(src => {
            let x = Object.assign({}, src);
            // create title with hotkey
            let hotkeys = x.hotkey.map(h => hotKeyDisplayMap[h] || h);
            x.title += ` – ${hotkeys.join(' + ')}`;

            if (x.hotkey2) {
                x.title += ` / ${x.hotkey2.map(h => hotKeyDisplayMap[h] || h)}`;
            }

            // call visible/disabled methods and turn them to booleans
            x.menuBar.visible = x.menuBar.isVisible({ selectedNodes, allowedWorkflowActions });
            x.menuBar.disabled = x.menuBar.isDisabled({ selectedNodes, allowedWorkflowActions });

            return x;
        });
    },

    hotKeyItems(state, getters, rootState, rootGetters) {
        return hotKeys;
    }
};
