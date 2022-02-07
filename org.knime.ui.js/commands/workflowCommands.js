import executionCommands from './executionCommands';

import RedoIcon from '~/assets/redo.svg?inline';
import UndoIcon from '~/assets/undo.svg?inline';
import DeleteIcon from '~/assets/delete.svg?inline';
import OpenViewIcon from '~/assets/open-view.svg?inline';
import OpenDialogIcon from '~/assets/configure-node.svg?inline';
import SaveIcon from '~/assets/save.svg?inline';

const isWritable = ({ $store }) => $store.getters['workflow/isWritable'];

export default {
    ...executionCommands,
    save: {
        title: 'Save workflow',
        hotkey: ['Ctrl', 'S'],
        icon: SaveIcon,
        execute:
        ({ $store }) => $store.dispatch('workflow/saveWorkflow'),
        condition:
        ({ $store }) => $store.getters['workflow/isDirty']
    },
    undo: {
        title: 'Undo',
        hotkey: ['Ctrl', 'Z'],
        icon: UndoIcon,
        execute:
            ({ $store }) => $store.dispatch('workflow/undo'),
        condition:
            ({ $store }) => $store.state.workflow.activeWorkflow?.allowedActions.canUndo
    },
    redo: {
        title: 'Redo',
        hotkey: ['Ctrl', 'Shift', 'Z'],
        icon: RedoIcon,
        execute:
            ({ $store }) => $store.dispatch('workflow/redo'),
        condition:
            ({ $store }) => $store.state.workflow.activeWorkflow?.allowedActions.canRedo
    },
    configureNode: {
        text: 'Configure',
        hotkey: ['F6'],
        icon: OpenDialogIcon,
        execute:
            ({ $store }) => $store.dispatch('workflow/openDialog', $store.getters['selection/singleSelectedNode'].id),
        condition:
            ({ $store }) => $store.getters['selection/singleSelectedNode']?.allowedActions.canOpenDialog
    },
    openView: {
        text: 'Open view',
        hotkey: ['F12'],
        icon: OpenViewIcon,
        execute:
            ({ $store }) => $store.dispatch('workflow/openView', $store.getters['selection/singleSelectedNode'].id),
        condition:
            ({ $store }) => $store.getters['selection/singleSelectedNode']?.allowedActions.canOpenView

    },
    deleteSelected: {
        text: 'Delete',
        title: 'Delete selection',
        hotkey: ['Delete'],
        icon: DeleteIcon,
        execute:
            ({ $store }) => $store.dispatch('workflow/deleteSelectedObjects'),
        condition({ $store }) {
            if (!isWritable) { return false; }

            const selectedNodes = $store.getters['selection/selectedNodes'];
            const selectedConnections = $store.getters['selection/selectedConnections'];

            // disable if nothing selected
            if (selectedNodes.length === 0 && selectedConnections.length === 0) {
                return false;
            }
            const allSelectedDeletable =
                selectedNodes.every(node => node.allowedActions.canDelete) &&
                selectedConnections.every(connection => connection.allowedActions.canDelete);

            // enabled, if all selected objects are not deletable
            return allSelectedDeletable;
        }
    }
};
