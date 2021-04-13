import ExecuteAllIcon from '~/assets/execute-all.svg?inline';
import CancelAllIcon from '~/assets/cancel-execution.svg?inline';
import ResetAllIcon from '~/assets/reset-all.svg?inline';
import ExecuteSelectedIcon from '~/assets/execute-selected.svg?inline';
import CancelSelectedIcon from '~/assets/cancel-selected.svg?inline';
import ResetSelectedIcon from '~/assets/reset-selected.svg?inline';
import RedoIcon from '~/assets/redo.svg?inline';
import UndoIcon from '~/assets/undo.svg?inline';
import DeleteIcon from '~/assets/delete.svg?inline';

/**
 * All hotkeys should be defined here. Look in HotKeys.vue for the global handling
 */
const hotKeys = {
    zoomToFit: ['Ctrl', '1'],
    resetZoom: ['Ctrl', '0'],
    zoomIn: ['Ctrl', '+'],
    zoomOut: ['Ctrl', '-'],
    selectAllNodes: ['Ctrl', 'A'],
    executeAllNodes: ['Shift', 'F7'],
    cancelAllNodes: ['Shift', 'F9'],
    resetAllNodes: ['Shift', 'F8'],
    undo: ['Ctrl', 'Z'],
    redo: ['Ctrl', 'Shift', 'Z'],
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
    DELETE: 'Delete'
};

const hotKeyDisplayMapForMac = {
    Shift: '⇧',
    BACKSPACE: '⌫',
    DELETE: '⌫',
    Ctrl: '⌘'
};

const actionMap = {
    undo: {
        text: null,
        title: 'Undo',
        hotkey: hotKeys.undo,
        icon: UndoIcon,
        storeAction: 'workflow/undo',
        storeActionParams: [],
        isDisabled: ({ allowedWorkflowActions }) => !allowedWorkflowActions.canUndo
    },
    redo: {
        text: null,
        title: 'Redo',
        hotkey: hotKeys.redo,
        icon: RedoIcon,
        storeAction: 'workflow/redo',
        storeActionParams: [],
        isDisabled: ({ allowedWorkflowActions }) => !allowedWorkflowActions.canRedo
    },
    executeAll: {
        text: 'Execute all',
        title: 'Execute workflow',
        hotkey: hotKeys.executeAllNodes,
        icon: ExecuteAllIcon,
        storeAction: 'workflow/executeNodes',
        storeActionParams: ['all'],
        isDisabled: ({ allowedWorkflowActions }) => !allowedWorkflowActions.canExecute
    },
    cancelAll: {
        text: 'Cancel all',
        title: 'Cancel workflow execution',
        hotkey: hotKeys.cancelAllNodes,
        icon: CancelAllIcon,
        storeAction: 'workflow/cancelNodeExecution',
        storeActionParams: ['all'],
        isDisabled: ({ allowedWorkflowActions }) => !allowedWorkflowActions.canCancel
    },
    resetAll: {
        text: 'Reset all',
        title: 'Reset executed nodes',
        hotkey: hotKeys.resetAllNodes,
        icon: ResetAllIcon,
        storeAction: 'workflow/resetNodes',
        storeActionParams: ['all'],
        isDisabled: ({ allowedWorkflowActions }) => !allowedWorkflowActions.canReset
    },
    executeSelected: {
        text: 'Execute',
        title: 'Execute selected nodes',
        hotkey: hotKeys.executeSelectedNodes,
        icon: ExecuteSelectedIcon,
        storeAction: 'workflow/executeNodes',
        storeActionParams: ['selected'],
        isDisabled: ({ selectedNodes }) => !selectedNodes.some(node => node.allowedActions.canExecute)
    },
    cancelSelected: {
        text: 'Cancel',
        title: 'Cancel selected nodes',
        hotkey: hotKeys.cancelSelectedNodes,
        icon: CancelSelectedIcon,
        storeAction: 'workflow/cancelNodeExecution',
        storeActionParams: ['selected'],
        isDisabled: ({ selectedNodes }) => !selectedNodes.some(node => node.allowedActions.canCancel)
    },
    resetSelected: {
        text: 'Reset',
        title: 'Reset selected nodes',
        hotkey: hotKeys.resetSelectedNodes,
        icon: ResetSelectedIcon,
        storeAction: 'workflow/resetNodes',
        storeActionParams: ['selected'],
        isDisabled: ({ selectedNodes }) => !selectedNodes.some(node => node.allowedActions.canReset)
    },
    deleteSelected: {
        text: 'Delete',
        title: 'Delete selection',
        hotkey: hotKeys.deleteDel,
        icon: DeleteIcon,
        storeAction: 'workflow/deleteSelectedNodes',
        storeActionParams: [],
        isDisabled: ({ selectedNodes }) => !selectedNodes.every(node => node.allowedActions.canDelete)
    }
};

const testIfIsMac = () => navigator?.userAgent?.toLowerCase()?.includes('mac');

const mapActions = (actionList, selectedNodes, allowedWorkflowActions) => {
    const isMac = testIfIsMac();
    return actionList.map(src => {
        let x = Object.assign({}, src);
        // create title with hotkey
        if (isMac) {
            const hotkeys = x.hotkey.map(h => hotKeyDisplayMapForMac[h] || h);
            x.hotkeyText = hotkeys.join(' ');
        } else {
            const hotkeys = x.hotkey.map(h => hotKeyDisplayMap[h] || h);
            x.hotkeyText = hotkeys.join(' + ');
        }

        // call disabled methods and turn them to booleans
        x.disabled = x.isDisabled({ selectedNodes, allowedWorkflowActions });

        return x;
    });
};

export const getters = {

    mainMenuActionItems(state, getters, rootState, rootGetters) {
        const selectedNodes = rootGetters['workflow/selectedNodes']();
        const allowedWorkflowActions = rootState.workflow.activeWorkflow?.allowedActions || {};

        let actionList = [
            actionMap.undo,
            actionMap.redo
        ];

        if (selectedNodes.length === 0) {
            actionList.push(
                actionMap.executeAll,
                actionMap.cancelAll,
                actionMap.resetAll
            );
        } else {
            actionList.push(
                actionMap.executeSelected,
                actionMap.cancelSelected,
                actionMap.resetSelected,
                actionMap.deleteSelected
            );
        }

        return mapActions(actionList, selectedNodes, allowedWorkflowActions);
    },

    contextMenuActionItems(state, getters, rootState, rootGetters) {
        const selectedNodes = rootGetters['workflow/selectedNodes']();
        const allowedWorkflowActions = rootState.workflow.activeWorkflow?.allowedActions || {};

        let actionList = [
        ];

        if (selectedNodes.length === 0) {
            actionList.push(
                actionMap.executeAll,
                actionMap.cancelAll,
                actionMap.resetAll
            );
        } else {
            actionList.push(
                actionMap.executeSelected,
                actionMap.cancelSelected,
                actionMap.resetSelected,
                actionMap.deleteSelected
            );
        }

        return mapActions(actionList, selectedNodes, allowedWorkflowActions);
    },

    hotKeyItems(state, getters, rootState, rootGetters) {
        return hotKeys;
    }
};
