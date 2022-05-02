import executionCommands from './executionCommands';

import RedoIcon from '~/assets/redo.svg?inline';
import UndoIcon from '~/assets/undo.svg?inline';
import DeleteIcon from '~/assets/delete.svg?inline';
import OpenViewIcon from '~/assets/open-view.svg?inline';
import OpenDialogIcon from '~/assets/configure-node.svg?inline';
import SaveIcon from '~/assets/save.svg?inline';
import CreateMetanode from '~/assets/create-metanode.svg?inline';

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
            ({ $store }) => $store.state.workflow.activeWorkflow?.dirty
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
    configureFlowVariables: {
        text: 'Configure flow variables',
        execute:
            ({ $store }) => $store.dispatch('workflow/configureFlowVariables',
                $store.getters['selection/singleSelectedNode'].id),
        condition:
            ({ $store }) => $store.getters['selection/singleSelectedNode']?.allowedActions
                .canOpenLegacyFlowVariableDialog
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
    editName: {
        text: 'Rename',
        hotkey: ['F2'],
        execute:
            ({ $store }) => $store.dispatch('workflow/openNameEditor',
                $store.getters['selection/singleSelectedNode'].id),
        condition:
            ({ $store }) => ['metanode', 'component']
                .includes($store.getters['selection/singleSelectedNode']?.kind) &&
                !$store.getters['selection/singleSelectedNode']?.link &&
                $store.getters['workflow/isWritable']
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
    },
    createMetanode: {
        text: 'Create Metanode',
        title: 'Create metanode',
        hotkey: ['Ctrl', 'G'],
        icon: CreateMetanode,
        execute:
        ({ $store }) => $store.dispatch('workflow/collapseToContainer', { containerType: 'metanode' }),
        condition:
        ({ $store }) => !$store.getters['selection/selectedNodes']
            .some(node => node.allowedActions.canCollapse === 'false')
    }
};
