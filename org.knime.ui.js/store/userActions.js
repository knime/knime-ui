import ExecuteAllIcon from '~/assets/execute-all.svg?inline';
import CancelAllIcon from '~/assets/cancel-execution.svg?inline';
import ResetAllIcon from '~/assets/reset-all.svg?inline';
import ExecuteSelectedIcon from '~/assets/execute-selected.svg?inline';
import CancelSelectedIcon from '~/assets/cancel-selected.svg?inline';
import ResetSelectedIcon from '~/assets/reset-selected.svg?inline';
import RedoIcon from '~/assets/redo.svg?inline';
import UndoIcon from '~/assets/undo.svg?inline';
import DeleteIcon from '~/assets/delete.svg?inline';
import SaveIcon from '~/assets/save.svg?inline';

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
    save: ['Ctrl', 'S'],
    undo: ['Ctrl', 'Z'],
    redo: ['Ctrl', 'Shift', 'Z'],
    executeSelectedNodes: ['F7'],
    resetSelectedNodes: ['F8'],
    cancelSelectedNodes: ['F9'],
    deleteBackspace: ['BACKSPACE'],
    deleteDel: ['DELETE'],
    openView: ['F12'],
    openDialog: ['F6'],
    stepLoopExecution: ['Ctrl', 'Alt', 'F6'],
    pauseLoopExecution: ['Ctrl', 'Alt', 'F7'],
    resumeLoopExecution: ['Ctrl', 'Alt', 'F8']
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
    Ctrl: '⌘',
    Alt: '⌥'
};

/**
 * Actions as used by toolbar and context menu. The hotkey property is only used for user display. Hotkey handling is
 * done in HotKeys.vue!
 */
const actionMap = {
    // global stuff (toolbar)
    save: {
        text: null,
        title: 'Save workflow',
        hotkey: hotKeys.save,
        icon: SaveIcon,
        storeAction: 'workflow/saveWorkflow',
        storeActionParams: [],
        disabled: ({ isDirty }) => !isDirty
    },
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
        disabled({ selectedNodes, selectedConnections, isWritable }) {
            // disable for write-protected workflow
            if (!isWritable) {
                return true;
            }
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
        title: 'Resume loop execution',
        hotkey: hotKeys.resumeLoopExecution,
        storeAction: 'workflow/resumeLoopExecution',
        storeActionParams: ({ selectedNodes }) => [selectedNodes[0].id],
        disabled: ({ selectedNodes }) => !selectedNodes.every(node => node.loopInfo?.allowedActions.canResume)
    },
    pauseLoopExecution: {
        text: 'Pause loop execution',
        title: 'Pause loop execution',
        hotkey: hotKeys.pauseLoopExecution,
        storeAction: 'workflow/pauseLoopExecution',
        storeActionParams: ({ selectedNodes }) => [selectedNodes[0].id],
        disabled: ({ selectedNodes }) => !selectedNodes.every(node => node.loopInfo?.allowedActions.canPause)
    },
    stepLoopExecution: {
        text: 'Step loop execution',
        title: 'Step loop execution',
        hotkey: hotKeys.stepLoopExecution,
        storeAction: 'workflow/stepLoopExecution',
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

const testIfIsMac = () => navigator?.userAgent?.toLowerCase()?.includes('mac');

// eslint-disable-next-line max-params
const mapActions = (actionList, selectedNodes, selectedConnections, allowedWorkflowActions, isWritable, isDirty) => {
    const isMac = testIfIsMac();
    return actionList.map(src => {
        let action = { ...src };
        // create title with hotkey
        if (action.hotkey) {
            if (isMac) {
                const hotkeys = action.hotkey.map(h => hotKeyDisplayMapForMac[h] || h);
                action.hotkeyText = hotkeys.join(' ');
            } else {
                const hotkeys = action.hotkey.map(h => hotKeyDisplayMap[h] || h);
                action.hotkeyText = hotkeys.join(' ');
            }
        }

        // call disabled methods and turn them to booleans
        if (typeof src.disabled === 'function') {
            action.disabled = src.disabled({ selectedNodes,
                selectedConnections,
                allowedWorkflowActions,
                isWritable,
                isDirty });
        }

        // call action params if they are a function
        if (typeof src.storeActionParams === 'function') {
            action.storeActionParams = src.storeActionParams({ selectedNodes, selectedConnections });
        }

        return action;
    });
};

export const getters = {

    mainMenuActionItems(state, getters, rootState, rootGetters) {
        const selectedNodes = rootGetters['selection/selectedNodes'];
        const selectedConnections = rootGetters['selection/selectedConnections'];
        const isWritable = rootGetters['workflow/isWritable'];
        const isDirty = rootGetters['workflow/isDirty'];
        const allowedWorkflowActions = rootState.workflow.activeWorkflow?.allowedActions || {};

        let actionList = [
            actionMap.save,
            actionMap.undo,
            actionMap.redo
        ];

        if (selectedNodes.length === 0 && selectedConnections.length === 0) {
            actionList.push(
                actionMap.executeAll,
                actionMap.cancelAll,
                actionMap.resetAll
            );
        } else if (selectedNodes.length > 0) {
            actionList.push(
                actionMap.executeSelected,
                actionMap.cancelSelected,
                actionMap.resetSelected
            );
        }
        // show delete button if at least one node or connection is selected; is disabled for no selection states
        if (selectedNodes.length > 0 || selectedConnections.length > 0) {
            actionList.push(
                actionMap.deleteSelected
            );
        }

        return mapActions(actionList, selectedNodes, selectedConnections, allowedWorkflowActions, isWritable, isDirty);
    },

    contextMenuActionItems(state, getters, rootState, rootGetters) {
        const selectedNodes = rootGetters['selection/selectedNodes'];
        const selectedConnections = rootGetters['selection/selectedConnections'];
        const isWritable = rootGetters['workflow/isWritable'];
        const allowedWorkflowActions = rootState.workflow.activeWorkflow?.allowedActions || {};

        let actionList = [];

        if (selectedNodes.length === 0) {
            // if no node is selected it might be still a connection that can be deleted
            if (selectedConnections.length > 0) {
                actionList.push(
                    actionMap.deleteSelected
                );
            } else {
                actionList.push(
                    actionMap.executeAll,
                    actionMap.cancelAll,
                    actionMap.resetAll
                );
            }
        } else if (selectedNodes.length === 1) {
            const selectedNodeAllAllowedActions = {
                ...selectedNodes[0].allowedActions,
                ...selectedNodes[0].loopInfo?.allowedActions
            };

            // different actions for a single node
            if (selectedNodeAllAllowedActions.canPause) {
                actionList.push(actionMap.pauseLoopExecution);
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

        return mapActions(actionList, selectedNodes, selectedConnections, allowedWorkflowActions, isWritable);
    },

    hotKeyItems(state, getters, rootState, rootGetters) {
        return hotKeys;
    },

    zoomActionItems(state, getters, rootState, rootGetters) {
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
                storeAction: 'canvas/zoomTo',
                storeActionParams: [1]
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
        return mapActions(zoomOptions, [], [], {});
    }
};
