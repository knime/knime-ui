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
 * All hotkeys should be defined here. Look in HotKeys.vue for the real execution handling.
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
    deleteDel: ['DELETE'],
    openView: ['F12'],
    openDialog: ['F6']
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

/**
 * Actions as used by toolbar and context menu. The hotkey property is only used for user display. Hotkey handling is
 * done in HotKeys.vue!
 */
const actionMap = {
    // global stuff (toolbar)
    undo: {
        text: null,
        title: 'Undo',
        hotkey: hotKeys.undo,
        icon: UndoIcon,
        storeAction: 'workflow/undo',
        storeActionParams: [],
        disabled: ({ allowedWorkflowActions }) => !allowedWorkflowActions.canUndo
    },
    redo: {
        text: null,
        title: 'Redo',
        hotkey: hotKeys.redo,
        icon: RedoIcon,
        storeAction: 'workflow/redo',
        storeActionParams: [],
        disabled: ({ allowedWorkflowActions }) => !allowedWorkflowActions.canRedo
    },
    // all nodes (nothing selected)
    executeAll: {
        text: 'Execute all',
        title: 'Execute workflow',
        hotkey: hotKeys.executeAllNodes,
        icon: ExecuteAllIcon,
        storeAction: 'workflow/executeNodes',
        storeActionParams: ['all'],
        disabled: ({ allowedWorkflowActions }) => !allowedWorkflowActions.canExecute
    },
    cancelAll: {
        text: 'Cancel all',
        title: 'Cancel workflow execution',
        hotkey: hotKeys.cancelAllNodes,
        icon: CancelAllIcon,
        storeAction: 'workflow/cancelNodeExecution',
        storeActionParams: ['all'],
        disabled: ({ allowedWorkflowActions }) => !allowedWorkflowActions.canCancel
    },
    resetAll: {
        text: 'Reset all',
        title: 'Reset executed nodes',
        hotkey: hotKeys.resetAllNodes,
        icon: ResetAllIcon,
        storeAction: 'workflow/resetNodes',
        storeActionParams: ['all'],
        disabled: ({ allowedWorkflowActions }) => !allowedWorkflowActions.canReset
    },
    // selected nodes (multiple)
    executeSelected: {
        text: 'Execute',
        title: 'Execute selected nodes',
        hotkey: hotKeys.executeSelectedNodes,
        icon: ExecuteSelectedIcon,
        storeAction: 'workflow/executeNodes',
        storeActionParams: ['selected'],
        disabled: ({ selectedNodes }) => !selectedNodes.some(node => node.allowedActions.canExecute)
    },
    cancelSelected: {
        text: 'Cancel',
        title: 'Cancel selected nodes',
        hotkey: hotKeys.cancelSelectedNodes,
        icon: CancelSelectedIcon,
        storeAction: 'workflow/cancelNodeExecution',
        storeActionParams: ['selected'],
        disabled: ({ selectedNodes }) => !selectedNodes.some(node => node?.allowedActions.canCancel)
    },
    resetSelected: {
        text: 'Reset',
        title: 'Reset selected nodes',
        hotkey: hotKeys.resetSelectedNodes,
        icon: ResetSelectedIcon,
        storeAction: 'workflow/resetNodes',
        storeActionParams: ['selected'],
        disabled: ({ selectedNodes }) => !selectedNodes.some(node => node.allowedActions.canReset)
    },
    deleteSelected: {
        text: 'Delete',
        title: 'Delete selection',
        hotkey: hotKeys.deleteDel,
        icon: DeleteIcon,
        storeAction: 'workflow/deleteSelectedObjects',
        storeActionParams: [],
        disabled({ selectedNodes, selectedConnections }) {
            // disable for no selections
            if (selectedNodes.length === 0 && selectedConnections.length === 0) {
                return true;
            }
            const allSelectedDeletable = selectedNodes.every(node => node.allowedActions.canDelete) &&
                selectedConnections.every(connection => connection.allowedActions.canDelete);
            // disable if one of the selected objects are not deletable
            return !allSelectedDeletable;
        }
    },
    // single node
    resumeLoopExecution: {
        text: 'Resume loop execution',
        title: '',
        hotkey: [],
        storeAction: 'workflow/resumeNodeExecution',
        storeActionParams: ({ selectedNodes }) => [selectedNodes[0].id],
        disabled: ({ selectedNodes }) => !selectedNodes.every(node => node.loopInfo?.allowedActions.canResume)
    },
    pauseExecution: {
        text: 'Pause execution',
        title: '',
        hotkey: [],
        storeAction: 'workflow/pauseNodeExecution',
        storeActionParams: ({ selectedNodes }) => [selectedNodes[0].id],
        disabled: ({ selectedNodes }) => !selectedNodes.every(node => node.loopInfo?.allowedActions.canPause)
    },
    stepLoopExecution: {
        text: 'Step loop execution',
        title: '',
        hotkey: [],
        storeAction: 'workflow/stepNodeExecution',
        storeActionParams: ({ selectedNodes }) => [selectedNodes[0].id],
        disabled: ({ selectedNodes }) => !selectedNodes.every(node => node.loopInfo?.allowedActions.canStep)
    },
    configureNode: {
        text: 'Configure',
        title: '',
        hotkey: hotKeys.openDialog,
        storeAction: 'workflow/openDialog',
        storeActionParams: ({ selectedNodes }) => [selectedNodes[0].id],
        disabled: ({ selectedNodes }) => !selectedNodes.every(node => node.allowedActions.canOpenDialog)
    },
    openView: {
        text: 'Open view',
        title: '',
        hotkey: hotKeys.openView,
        storeAction: 'workflow/openView',
        storeActionParams: ({ selectedNodes }) => [selectedNodes[0].id],
        disabled: ({ selectedNodes }) => !selectedNodes.every(node => node.allowedActions.canOpenView)
    }
};

const zoomOptions = [
    {
        text: 'Fit to screen',
        hotkey: hotKeys.zoomToFit,
        storeAction: 'canvas/setZoomToFit',
        storeActionParams: []
    },
    {
        text: 'Zoom in',
        hotkey: hotKeys.zoomIn,
        storeAction: 'canvas/zoomCentered',
        storeActionParams: [1]
    },
    {
        text: 'Zoom out',
        hotkey: hotKeys.zoomOut,
        storeAction: 'canvas/zoomCentered',
        storeActionParams: [-1]
    },
    {
        text: 'Zoom to 75%',
        storeAction: 'canvas/zoomTo',
        // eslint-disable-next-line no-magic-numbers
        storeActionParams: [0.75]
    },
    {
        text: 'Zoom to 100%',
        hotkey: hotKeys.resetZoom,
        storeAction: 'canvas/zoomToDefault',
        storeActionParams: []
    },
    {
        text: 'Zoom to 125%',
        storeAction: 'canvas/zoomTo',
        // eslint-disable-next-line no-magic-numbers
        storeActionParams: [1.25]
    },
    {
        text: 'Zoom to 150%',
        storeAction: 'canvas/zoomTo',
        // eslint-disable-next-line no-magic-numbers
        storeActionParams: [1.5]
    }
];

const testIfIsMac = () => navigator?.userAgent?.toLowerCase()?.includes('mac');

const mapActions = (actionList, selectedNodes, selectedConnections, allowedWorkflowActions) => {
    const isMac = testIfIsMac();
    return actionList.map(src => {
        let x = Object.assign({}, src);
        // create title with hotkey
        if (x.hotkey) {
            if (isMac) {
                const hotkeys = x.hotkey.map(h => hotKeyDisplayMapForMac[h] || h);
                x.hotkeyText = hotkeys.join(' ');
            } else {
                const hotkeys = x.hotkey.map(h => hotKeyDisplayMap[h] || h);
                x.hotkeyText = hotkeys.join(' + ');
            }
        }

        // call disabled methods and turn them to booleans
        if (typeof src.disabled === 'function') {
            x.disabled = src.disabled({ selectedNodes, selectedConnections, allowedWorkflowActions });
        }

        // call action params if they are a function
        if (typeof src.storeActionParams === 'function') {
            x.storeActionParams = src.storeActionParams({ selectedNodes, selectedConnections });
        }

        return x;
    });
};

export const getters = {

    mainMenuActionItems(state, getters, rootState, rootGetters) {
        const selectedNodes = rootGetters['selection/selectedNodes'];
        const selectedConnections = rootGetters['selection/selectedConnections'];
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
                actionMap.resetSelected
            );
        }
        // show delete button either way; is disabled for no selection states
        actionList.push(
            actionMap.deleteSelected
        );

        return mapActions(actionList, selectedNodes, selectedConnections, allowedWorkflowActions);
    },

    contextMenuActionItems(state, getters, rootState, rootGetters) {
        const selectedNodes = rootGetters['selection/selectedNodes'];
        const selectedConnections = rootGetters['selection/selectedConnections'];
        const allowedWorkflowActions = rootState.workflow.activeWorkflow?.allowedActions || {};

        let actionList = [];

        if (selectedNodes.length === 0) {
            actionList.push(
                actionMap.executeAll,
                actionMap.cancelAll,
                actionMap.resetAll
            );
            // if no node is selected it might be still a connection that can be deleted
            if (selectedConnections.length > 0) {
                actionList.push(
                    actionMap.deleteSelected
                );
            }
        } else if (selectedNodes.length === 1) {
            const selectedNodeAllAllowedActions = {
                ...selectedNodes[0].allowedActions,
                ...selectedNodes[0].loopInfo?.allowedActions
            };

            // different actions for a single node
            if (selectedNodeAllAllowedActions.canPause) {
                actionList.push(actionMap.pauseExecution);
            } else if (selectedNodeAllAllowedActions.canResume) {
                actionList.push(actionMap.resumeLoopExecution);
            } else {
                actionList.push(actionMap.executeSelected);
            }

            if ('canStep' in selectedNodeAllAllowedActions) {
                actionList.push(actionMap.stepLoopExecution);
            }

            actionList.push(
                actionMap.cancelSelected,
                actionMap.resetSelected,
                actionMap.configureNode
            );

            if ('canOpenView' in selectedNodeAllAllowedActions) {
                actionList.push(actionMap.openView);
            }

            actionList.push(
                actionMap.deleteSelected
            );
        } else {
            actionList.push(
                actionMap.executeSelected,
                actionMap.cancelSelected,
                actionMap.resetSelected,
                actionMap.deleteSelected
            );
        }

        return mapActions(actionList, selectedNodes, selectedConnections, allowedWorkflowActions);
    },

    hotKeyItems(state, getters, rootState, rootGetters) {
        return hotKeys;
    },

    zoomActionItems(state, getters, rootState, rootGetters) {
        return mapActions(zoomOptions, [], [], {});
    }
};
