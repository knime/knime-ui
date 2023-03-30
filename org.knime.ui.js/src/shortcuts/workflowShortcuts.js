import executionShortcuts from './executionShortcuts';

import RedoIcon from 'webapps-common/ui/assets/img/icons/redo.svg';
import UndoIcon from 'webapps-common/ui/assets/img/icons/undo.svg';
import DeleteIcon from '@/assets/delete.svg';
import OpenViewIcon from '@/assets/open-view.svg';
import OpenDialogIcon from '@/assets/configure-node.svg';
import SaveIcon from 'webapps-common/ui/assets/img/icons/save.svg';
import CreateMetanode from 'webapps-common/ui/assets/img/icons/metanode-add.svg';
import CreateComponent from 'webapps-common/ui/assets/img/icons/component.svg';
import LayoutIcon from 'webapps-common/ui/assets/img/icons/layout-editor.svg';

const canExpand = (kind) => ({ $store }) => {
    const selectedNode = $store.getters['selection/singleSelectedNode'];

    if (!$store.getters['workflow/isWritable'] || selectedNode?.link) {
        return false;
    }

    return selectedNode?.kind === kind && selectedNode?.allowedActions.canExpand !== 'false';
};

export default {
    ...executionShortcuts,
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
            ({ $store }) => $store.dispatch('workflow/openNodeConfiguration',
                $store.getters['selection/singleSelectedNode'].id),
        condition:
            ({ $store }) => $store.getters['selection/singleSelectedNode']?.allowedActions.canOpenDialog
    },
    configureFlowVariables: {
        text: 'Configure flow variables',
        hotkey: ['Shift', 'F6'],
        execute:
            ({ $store }) => $store.dispatch('workflow/openFlowVariableConfiguration',
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
        hotkey: ['Shift', 'F2'],
        execute: ({ $store }) => $store.dispatch(
            'workflow/openNameEditor',
            $store.getters['selection/singleSelectedNode'].id
        ),
        condition: ({ $store }) => ['metanode', 'component']
            .includes($store.getters['selection/singleSelectedNode']?.kind) &&
            !$store.getters['selection/singleSelectedNode']?.link &&
            $store.getters['workflow/isWritable']
    },
    editNodeLabel: {
        text: 'Edit node label',
        hotkey: ['F2'],
        execute: ({ $store }) => $store.dispatch(
            'workflow/openLabelEditor',
            $store.getters['selection/singleSelectedNode'].id
        ),
        condition: ({ $store }) => {
            const singleSelectedNode = $store.getters['selection/singleSelectedNode'];

            return (
                singleSelectedNode !== null &&
                $store.getters['workflow/isWritable']
            );
        }
    },
    deleteSelected: {
        text: 'Delete',
        title: 'Delete selection',
        hotkey: ['Delete'],
        icon: DeleteIcon,
        execute:
            ({ $store }) => $store.dispatch('workflow/deleteSelectedObjects'),
        condition({ $store }) {
            if (!$store.getters['workflow/isWritable']) {
                return false;
            }

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
        text: 'Create metanode',
        title: 'Create metanode',
        hotkey: ['Ctrl', 'G'],
        icon: CreateMetanode,
        execute:
            ({ $store }) => $store.dispatch('workflow/collapseToContainer', { containerType: 'metanode' }),
        condition({ $store }) {
            if (!$store.getters['workflow/isWritable']) {
                return false;
            }

            if (!$store.getters['selection/selectedNodes'].length) {
                return false;
            }

            return $store.getters['selection/selectedNodes'].every(node => node.allowedActions.canCollapse !== 'false');
        }
    },
    createComponent: {
        text: 'Create component',
        title: 'Create component',
        hotkey: ['Ctrl', 'K'],
        icon: CreateComponent,
        execute:
            ({ $store }) => $store.dispatch('workflow/collapseToContainer', { containerType: 'component' }),
        condition({ $store }) {
            if (!$store.getters['workflow/isWritable']) {
                return false;
            }
            if (!$store.getters['selection/selectedNodes'].length) {
                return false;
            }

            return $store.getters['selection/selectedNodes'].every(node => node.allowedActions.canCollapse !== 'false');
        }
    },
    openComponent: {
        text: 'Open component',
        title: 'Open component',
        execute:
            ({ $store }) => {
                const projectId = $store.state.application.activeProjectId;
                const componentId = $store.getters['selection/singleSelectedNode'].id;
                $store.dispatch('application/switchWorkflow', {
                    newWorkflow: { workflowId: componentId, projectId }
                });
            }
    },
    expandMetanode: {
        text: 'Expand metanode',
        title: 'Expand metanode',
        hotkey: ['Ctrl', 'Shift', 'G'],
        execute: ({ $store }) => $store.dispatch('workflow/expandContainerNode'),
        condition: canExpand('metanode')
    },
    expandComponent: {
        text: 'Expand component',
        title: 'Expand component',
        hotkey: ['Ctrl', 'Shift', 'K'],
        execute: ({ $store }) => $store.dispatch('workflow/expandContainerNode'),
        condition: canExpand('component')
    },
    openLayoutEditor: {
        text: 'Open layout editor',
        title: 'Open layout editor',
        hotkey: ['Ctrl', 'D'],
        icon: LayoutIcon,
        execute:
            ({ $store }) => $store.dispatch('workflow/openLayoutEditor'),
        condition:
            ({ $store }) => $store.state.workflow.activeWorkflow?.info.containerType === 'component' &&
            $store.getters['workflow/isWritable']
    },
    copy: {
        text: 'Copy',
        title: 'Copy selection',
        hotkey: ['Ctrl', 'C'],
        allowEventDefault: true,
        execute:
            ({ $store }) => $store.dispatch('workflow/copyOrCutWorkflowParts', { command: 'copy' }),
        condition:
            ({ $store }) => {
                const kanvas = $store.state.canvas.getScrollContainerElement();
                const selectedNodes = Object.keys($store.getters['selection/selectedNodes']);
                const textSelectionIsEmpty = window?.getSelection().toString() === '';
                const kanvasIsActiveElement = document.activeElement === kanvas;
                return (
                    selectedNodes.length !== 0 &&
                    $store.state.application.hasClipboardSupport &&
                    (textSelectionIsEmpty || kanvasIsActiveElement)
                );
            }
    },
    cut: {
        text: 'Cut',
        title: 'Cut selection',
        hotkey: ['Ctrl', 'X'],
        execute:
            ({ $store }) => $store.dispatch('workflow/copyOrCutWorkflowParts', { command: 'cut' }),
        condition:
            ({ $store }) => {
                const selectedNodes = Object.keys($store.getters['selection/selectedNodes']);
                return (
                    selectedNodes.length !== 0 &&
                    $store.getters['workflow/isWritable'] &&
                    $store.state.application.hasClipboardSupport
                );
            }
    },
    paste: {
        text: 'Paste',
        title: 'Paste from clipboard',
        hotkey: ['Ctrl', 'V'],
        execute:
            ({ $store, eventDetail }) => {
                let customPosition = null;

                if (eventDetail) {
                    const { clientX, clientY } = eventDetail;

                    const [x, y] = $store.getters['canvas/screenToCanvasCoordinates']([clientX, clientY]);
                    customPosition = { x, y };
                }

                $store.dispatch('workflow/pasteWorkflowParts', { position: customPosition });
            },
        condition:
            ({ $store }) => $store.getters['workflow/isWritable'] && $store.state.application.hasClipboardSupport
    }
};
