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

const actionItemsList = [{
    text: null,
    title: 'Undo',
    hotkey: hotKeys.undo,
    icon: UndoIcon,
    storeAction: 'workflow/undo',
    storeActionParams: [],
    menuBar: {
        isDisabled: ({ allowedWorkflowActions }) => !allowedWorkflowActions.canUndo,
        isVisible: () => true
    }
}, {
    text: null,
    title: 'Redo',
    hotkey: hotKeys.redo,
    icon: RedoIcon,
    storeAction: 'workflow/redo',
    storeActionParams: [],
    menuBar: {
        isDisabled: ({ allowedWorkflowActions }) => !allowedWorkflowActions.canRedo,
        isVisible: () => true
    }
},{
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
    icon: ExecuteSelectedIcon,
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
    icon: CancelSelectedIcon,
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
    icon: ResetSelectedIcon,
    storeAction: 'workflow/resetNodes',
    storeActionParams: ['selected'],
    menuBar: {
        isDisabled: ({ selectedNodes }) => !selectedNodes.some(node => node.allowedActions.canReset),
        isVisible: ({ selectedNodes }) => selectedNodes.length > 0
    }
}, {
    text: 'Delete',
    title: 'Delete selection',
    hotkey: hotKeys.deleteDel,
    icon: DeleteIcon,
    storeAction: 'workflow/deleteSelectedNodes',
    storeActionParams: [],
    menuBar: {
        isDisabled: ({ selectedNodes }) => !selectedNodes.some(node => node.allowedActions.canDelete),
        isVisible: ({ selectedNodes }) => selectedNodes.length > 0
    }
}];

const testIfIsMac = () => navigator?.userAgent?.toLowerCase()?.includes('mac');

export const getters = {
    actionItems(state, getters, rootState, rootGetters) {
        const selectedNodes = rootGetters['workflow/selectedNodes']();
        const allowedWorkflowActions = rootState.workflow.activeWorkflow?.allowedActions || {};
        const isMac = testIfIsMac();

        return actionItemsList.map(src => {
            let x = Object.assign({}, src);
            // create title with hotkey
            if (isMac) {
                const hotkeys = x.hotkey.map(h => hotKeyDisplayMapForMac[h] || h);
                x.title += ` – ${hotkeys.join(' ')}`;
            } else {
                const hotkeys = x.hotkey.map(h => hotKeyDisplayMap[h] || h);
                x.title += ` – ${hotkeys.join(' + ')}`;
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
