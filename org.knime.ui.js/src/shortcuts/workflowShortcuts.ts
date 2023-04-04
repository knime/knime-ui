import RedoIcon from 'webapps-common/ui/assets/img/icons/redo.svg';
import UndoIcon from 'webapps-common/ui/assets/img/icons/undo.svg';
import DeleteIcon from '@/assets/delete.svg';
import OpenViewIcon from '@/assets/open-view.svg';
import OpenDialogIcon from '@/assets/configure-node.svg';
import SaveIcon from 'webapps-common/ui/assets/img/icons/save.svg';
import CreateMetanode from 'webapps-common/ui/assets/img/icons/metanode-add.svg';
import CreateComponent from 'webapps-common/ui/assets/img/icons/component.svg';
import LayoutIcon from 'webapps-common/ui/assets/img/icons/layout-editor.svg';

import type { ShortcutConditionContext, UnionToShortcutRegistry } from './types';
import { ReorderWorkflowAnnotationsCommand } from '@/api/gateway-api/generated-api';
import { portPositions } from '@/util/portShift';
import { nodeSize } from '@/style/shapes.mjs';
import { findFreeSpaceAroundCenterWithFallback,
    findFreeSpaceAroundPointWithFallback } from '@/util/findFreeSpaceOnCanvas';

type WorkflowShortcuts = UnionToShortcutRegistry<
    | 'save'
    | 'undo'
    | 'redo'
    | 'configureNode'
    | 'configureFlowVariables'
    | 'openView'
    | 'editName'
    | 'editNodeLabel'
    | 'deleteSelected'
    | 'createMetanode'
    | 'createComponent'
    | 'openComponent'
    | 'expandMetanode'
    | 'expandComponent'
    | 'openLayoutEditor'
    | 'copy'
    | 'cut'
    | 'paste'
    | 'bringAnnotationToFront'
    | 'bringAnnotationForward'
    | 'sendAnnotationBackward'
    | 'sendAnnotationToBack'
    | 'quickAddNode'
>

declare module './index' {
    interface ShortcutsRegistry extends WorkflowShortcuts {}
}

const canExpand = (kind: 'metanode' | 'component') => ({ $store }: ShortcutConditionContext) => {
    const selectedNode = $store.getters['selection/singleSelectedNode'];

    if (!$store.getters['workflow/isWritable'] || selectedNode?.link) {
        return false;
    }

    return selectedNode?.kind === kind && selectedNode?.allowedActions.canExpand !== 'false';
};

const workflowShortcuts: WorkflowShortcuts = {
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
            const selectedAnnotations = $store.getters['selection/selectedAnnotations'];

            // disable if nothing selected
            if (selectedNodes.length === 0 && selectedConnections.length === 0 && selectedAnnotations.length === 0) {
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
            ({ $store, payload }) => {
                let customPosition = null;

                if (payload.event) {
                    const { clientX, clientY } = payload.event as MouseEvent;

                    const [x, y] = $store.getters['canvas/screenToCanvasCoordinates']([clientX, clientY]);
                    customPosition = { x, y };
                }

                $store.dispatch('workflow/pasteWorkflowParts', { position: customPosition });
            },
        condition:
            ({ $store }) => $store.getters['workflow/isWritable'] && $store.state.application.hasClipboardSupport
    },
    bringAnnotationToFront: {
        text: 'Bring annotation to front',
        hotkey: ['Ctrl', 'Shift', 'ArrowUp'],
        execute: ({ $store }) => $store.dispatch('workflow/reorderWorkflowAnnotation', {
            action: ReorderWorkflowAnnotationsCommand.ActionEnum.BringToFront
        }),
        condition: ({ $store }) => $store.getters['selection/selectedAnnotations'].length > 0
    },
    bringAnnotationForward: {
        hotkey: ['Ctrl', 'ArrowUp'],
        text: 'Bring annotation forward',
        execute: ({ $store }) => $store.dispatch('workflow/reorderWorkflowAnnotation', {
            action: ReorderWorkflowAnnotationsCommand.ActionEnum.BringForward
        }),
        condition: ({ $store }) => $store.getters['selection/selectedAnnotations'].length > 0
    },
    sendAnnotationBackward: {
        hotkey: ['Ctrl', 'ArrowDown'],
        text: 'Send annotation backward',
        execute: ({ $store }) => $store.dispatch('workflow/reorderWorkflowAnnotation', {
            action: ReorderWorkflowAnnotationsCommand.ActionEnum.SendBackward
        }),
        condition: ({ $store }) => $store.getters['selection/selectedAnnotations'].length > 0
    },
    sendAnnotationToBack: {
        hotkey: ['Ctrl', 'Shift', 'ArrowDown'],
        text: 'Send annotation to back',
        execute: ({ $store }) => $store.dispatch('workflow/reorderWorkflowAnnotation', {
            action: ReorderWorkflowAnnotationsCommand.ActionEnum.SendToBack
        }),
        condition: ({ $store }) => $store.getters['selection/selectedAnnotations'].length > 0
    },
    quickAddNode: {
        text: 'Quick add node',
        title: 'Add new node',
        hotkey: ['Ctrl', '.'],
        execute: ({ $store }) => {
            // descruct current state
            const {
                isOpen,
                props: { nodeId: lastNodeId, port: { index: lastPortIndex } = { index: -1 }, position: lastPosition }
            } = $store.state.workflow.quickAddNodeMenu;

            // use the node of the currently open dialog because the node might not be selected in that case
            const node = isOpen
                ? $store.getters['workflow/getNodeById'](lastNodeId)
                : $store.getters['selection/singleSelectedNode'];

            if (['metanode', 'component'].includes(node.kind)) {
                return;
            }

            // global menu without predecessor node
            if (node === null) {
                // const kanvas = $store.state.canvas.getScrollContainerElement();
                // const { top, left, width, height } = kanvas.getBoundingClientRect();
                // const [x, y] = $store.getters['canvas/screenToCanvasCoordinates']([left + width / 2, top + height / 2]);

                const position = findFreeSpaceAroundCenterWithFallback({
                    visibleFrame: $store.getters['canvas/getVisibleFrame'](),
                    nodes: $store.state.workflow.activeWorkflow.nodes
                });
                $store.dispatch('workflow/openQuickAddNodeMenu', { props: { position } });
                return;
            }

            // shuffle between port indices, start with the first non mickey-mouse (flowvar) port
            let portIndex = 1;
            if (lastNodeId && lastNodeId === node.id) {
                const nextIndex = lastPortIndex + 1;
                portIndex = nextIndex < node.outPorts.length ? nextIndex : 0;
            }

            const port = node.outPorts[portIndex];
            let position = lastPosition;

            // if its not open we need to find a proper position to put the menu
            if (!isOpen) {
                const outPortPositions = portPositions({
                    portCount: node.outPorts.length,
                    isMetanode: node.kind === 'metanode',
                    isOutports: true
                });
                const startPoint = {
                // eslint-disable-next-line no-magic-numbers
                    x: node.position.x + outPortPositions[portIndex][0] + nodeSize * 3,
                    y: node.position.y + outPortPositions[portIndex][1]
                };
                position = findFreeSpaceAroundPointWithFallback({
                    startPoint,
                    visibleFrame: $store.getters['canvas/getVisibleFrame'](),
                    nodes: $store.state.workflow.activeWorkflow.nodes
                });
            }

            $store.dispatch('workflow/openQuickAddNodeMenu', { props: { nodeId: node.id, port, position } });
        },
        condition: ({ $store }) => $store.getters['workflow/isWritable']
    }
};

export default workflowShortcuts;
