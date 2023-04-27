/* eslint-disable max-lines */
import { ReorderWorkflowAnnotationsCommand } from '@/api/gateway-api/generated-api';
import { expect, describe, it, vi } from 'vitest';
import workflowShortcuts from '../workflowShortcuts';

const capitalize = (str) => str.charAt(0).toUpperCase().concat(str.slice(1));

describe('workflowShortcuts', () => {
    const mockSelectedNode = { id: 'root:0', allowedActions: {} };

    const createStore = ({
        containerType = 'project',
        selectedNodes = [],
        selectedConnections = [],
        selectedAnnotations = [],
        singleSelectedNode = mockSelectedNode,
        isWorkflowWritable = true,
        getScrollContainerElement = vi.fn(),
        getNodeById = vi.fn(),
        getVisibleFrame = vi.fn().mockReturnValue({ left: -500, top: -500, width: 1000, height: 1000 })
    } = {}) => {
        const mockDispatch = vi.fn();
        const $store = {
            dispatch: mockDispatch,
            state: {
                application: {
                    activeProjectId: 'activeTestProjectId',
                    hasClipboardSupport: true
                },
                workflow: {
                    activeWorkflow: {
                        allowedActions: {},
                        info: {
                            containerType
                        },
                        nodes: {
                            node1: {
                                position: {
                                    x: 300,
                                    y: 200
                                }
                            }
                        }
                    },
                    quickAddNodeMenu: {
                        isOpen: false,
                        props: {},
                        events: {}
                    }
                },
                canvas: {
                    getScrollContainerElement
                }
            },
            getters: {
                'selection/selectedNodes': selectedNodes,
                'selection/selectedConnections': selectedConnections,
                'selection/singleSelectedNode': singleSelectedNode,
                'selection/selectedAnnotations': selectedAnnotations,
                'workflow/isWritable': isWorkflowWritable,
                'workflow/getNodeById': getNodeById,
                'canvas/getVisibleFrame': getVisibleFrame
            }
        };

        return { mockDispatch, $store };
    };

    describe('execute', () => {
        it('save', () => {
            const { $store, mockDispatch } = createStore();
            workflowShortcuts.save.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/saveWorkflow');
        });

        it('undo', () => {
            const { $store, mockDispatch } = createStore();
            workflowShortcuts.undo.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/undo');
        });

        it('redo', () => {
            const { $store, mockDispatch } = createStore();
            workflowShortcuts.redo.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/redo');
        });

        it('configureNode', () => {
            const { $store, mockDispatch } = createStore();
            workflowShortcuts.configureNode.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/openNodeConfiguration', 'root:0');
        });

        it('configureFlowVariables', () => {
            const { $store, mockDispatch } = createStore();
            workflowShortcuts.configureFlowVariables.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/openFlowVariableConfiguration', 'root:0');
        });

        it('editName', () => {
            const { $store, mockDispatch } = createStore();
            workflowShortcuts.editName.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/openNameEditor', 'root:0');
        });

        it('editNodeLabel', () => {
            const { $store, mockDispatch } = createStore();
            workflowShortcuts.editNodeLabel.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/openLabelEditor', 'root:0');
        });

        it('deleteSelected', () => {
            const { $store, mockDispatch } = createStore();
            workflowShortcuts.deleteSelected.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/deleteSelectedObjects');
        });

        it('create metanode', () => {
            const { $store, mockDispatch } = createStore();
            workflowShortcuts.createMetanode.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/collapseToContainer', { containerType: 'metanode' });
        });

        it('create component', () => {
            const { $store, mockDispatch } = createStore();
            workflowShortcuts.createComponent.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/collapseToContainer', { containerType: 'component' });
        });

        it('open component', () => {
            const { $store, mockDispatch } = createStore();
            workflowShortcuts.openComponent.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('application/switchWorkflow',
                { newWorkflow: { workflowId: 'root:0', projectId: 'activeTestProjectId' } });
        });

        it('expand container node', () => {
            const { $store, mockDispatch } = createStore();
            workflowShortcuts.expandMetanode.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/expandContainerNode');
        });

        it('open layout editor', () => {
            const { $store, mockDispatch } = createStore();
            workflowShortcuts.openLayoutEditor.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/openLayoutEditor');
        });

        it('copy', () => {
            const { $store, mockDispatch } = createStore();
            workflowShortcuts.copy.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/copyOrCutWorkflowParts', { command: 'copy' });
        });

        it('cut', () => {
            const { $store, mockDispatch } = createStore();
            workflowShortcuts.cut.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/copyOrCutWorkflowParts', { command: 'cut' });
        });

        it('paste', () => {
            const { $store, mockDispatch } = createStore();
            workflowShortcuts.paste.execute({ $store, payload: {} });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/pasteWorkflowParts', expect.anything());
        });

        it.each([
            ['bringAnnotationToFront'],
            ['bringAnnotationForward'],
            ['sendAnnotationBackward'],
            ['sendAnnotationToBack']
        ])('should dispatch %s to reorder annotation', (shortcutName) => {
            const { $store, mockDispatch } = createStore();

            const actions = {
                bringAnnotationToFront: ReorderWorkflowAnnotationsCommand.ActionEnum.BringToFront,
                bringAnnotationForward: ReorderWorkflowAnnotationsCommand.ActionEnum.BringForward,
                sendAnnotationBackward: ReorderWorkflowAnnotationsCommand.ActionEnum.SendBackward,
                sendAnnotationToBack: ReorderWorkflowAnnotationsCommand.ActionEnum.SendToBack
            };
            const action = actions[shortcutName];

            workflowShortcuts[shortcutName].execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/reorderWorkflowAnnotation', { action });
        });
    });

    describe('condition', () => {
        it('save', () => {
            const { $store } = createStore();
            expect(workflowShortcuts.save.condition({ $store })).toBeFalsy();
            $store.state.workflow.activeWorkflow.dirty = true;
            expect(workflowShortcuts.save.condition({ $store })).toBe(true);
        });

        it('undo', () => {
            const { $store } = createStore();
            expect(workflowShortcuts.undo.condition({ $store })).toBeFalsy();
            $store.state.workflow.activeWorkflow.allowedActions.canUndo = true;
            expect(workflowShortcuts.undo.condition({ $store })).toBe(true);
        });

        it('redo', () => {
            const { $store } = createStore();
            expect(workflowShortcuts.redo.condition({ $store })).toBeFalsy();
            $store.state.workflow.activeWorkflow.allowedActions.canRedo = true;
            expect(workflowShortcuts.redo.condition({ $store })).toBe(true);
        });

        it('configureNode', () => {
            const { $store } = createStore();
            expect(workflowShortcuts.configureNode.condition({ $store })).toBeFalsy();
            $store.getters['selection/singleSelectedNode'].allowedActions = { canOpenDialog: true };
            expect(workflowShortcuts.configureNode.condition({ $store })).toBe(true);
        });

        it('configureFlowVariables', () => {
            const { $store } = createStore();
            expect(workflowShortcuts.configureFlowVariables.condition({ $store })).toBeFalsy();
            $store.getters['selection/singleSelectedNode'].allowedActions = {
                canOpenLegacyFlowVariableDialog: true
            };
            expect(workflowShortcuts.configureFlowVariables.condition({ $store })).toBe(true);
        });

        describe('editName', () => {
            it('cannot rename when workflow is not writable', () => {
                const { $store } = createStore();
                $store.getters['selection/singleSelectedNode'].kind = 'component';
                $store.getters['workflow/isWritable'] = false;

                expect(workflowShortcuts.editName.condition({ $store })).toBe(false);
            });

            it.each([
                ['component', true],
                ['metanode', true],
                ['node', false]
            ])('for nodes of kind: "%s" the condition should be "%s"', (kind, conditionValue) => {
                const { $store } = createStore();
                $store.getters['workflow/isWritable'] = true;
                $store.getters['selection/singleSelectedNode'].kind = kind;

                expect(workflowShortcuts.editName.condition({ $store })).toBe(conditionValue);
            });

            it('cannot rename if the selected node is linked', () => {
                const { $store } = createStore();
                $store.getters['workflow/isWritable'] = true;
                $store.getters['selection/singleSelectedNode'].kind = 'component';
                $store.getters['selection/singleSelectedNode'].link = true;

                expect(workflowShortcuts.editName.condition({ $store })).toBe(false);
            });
        });

        describe('editNodeLabel', () => {
            it('cannot edit label if no node is selected', () => {
                const { $store } = createStore({
                    isWorkflowWritable: true,
                    singleSelectedNode: null
                });

                expect(workflowShortcuts.editNodeLabel.condition({ $store })).toBe(false);
            });

            it('cannot edit label when workflow is not writable', () => {
                const { $store } = createStore({
                    isWorkflowWritable: false,
                    singleSelectedNode: {
                        kind: 'node',
                        id: 'node1'
                    }
                });

                expect(workflowShortcuts.editNodeLabel.condition({ $store })).toBe(false);
            });
        });

        describe('deleteSelected', () => {
            it('is not writeable ', () => {
                const { $store } = createStore({ singleSelectedNode: null });
                $store.getters['workflow/isWritable'] = false;
                expect(workflowShortcuts.deleteSelected.condition({ $store })).toBe(false);
            });

            it('nothing selected', () => {
                const { $store } = createStore({ singleSelectedNode: null });
                $store.getters['selection/selectedNodes'] = [];
                $store.getters['selection/selectedConnections'] = [];
                expect(workflowShortcuts.deleteSelected.condition({ $store })).toBe(false);
            });

            it('one node is not deletable', () => {
                const { $store } = createStore({
                    singleSelectedNode: null,
                    selectedNodes: [
                        { allowedActions: { canDelete: true } },
                        { allowedActions: { canDelete: false } }
                    ],
                    selectedConnections: [{ allowedActions: { canDelete: true } }]
                });

                expect(workflowShortcuts.deleteSelected.condition({ $store })).toBe(false);
            });

            it('one connection is not deletable', () => {
                const { $store } = createStore({
                    singleSelectedNode: null,
                    selectedNodes: [
                        { allowedActions: { canDelete: true } },
                        { allowedActions: { canDelete: true } }
                    ],
                    selectedConnections: [{ allowedActions: { canDelete: false } }]
                });
                expect(workflowShortcuts.deleteSelected.condition({ $store })).toBe(false);
            });

            it('all selected are deletable', () => {
                const { $store } = createStore({
                    singleSelectedNode: null,
                    selectedNodes: [
                        { allowedActions: { canDelete: true } },
                        { allowedActions: { canDelete: true } }
                    ],
                    selectedConnections: [
                        { allowedActions: { canDelete: true } },
                        { allowedActions: { canDelete: true } }
                    ]
                });
                expect(workflowShortcuts.deleteSelected.condition({ $store })).toBe(true);
            });

            it('only nodes are selected', () => {
                const { $store } = createStore({
                    singleSelectedNode: null,
                    selectedNodes: [
                        { allowedActions: { canDelete: true } },
                        { allowedActions: { canDelete: true } }
                    ]
                });

                expect(workflowShortcuts.deleteSelected.condition({ $store })).toBe(true);
            });
        });

        describe.each([
            ['component'],
            ['metanode']
        ])('create %s', (nodeKind) => {
            const shortcut = `create${capitalize(nodeKind)}`;

            it(`it can not create ${nodeKind} when canCollapse is false`, () => {
                const { $store } = createStore({
                    selectedNodes: [{ allowedActions: { canCollapse: 'true' } }]
                });

                expect(workflowShortcuts[shortcut].condition({ $store })).toBe(true);

                $store.getters['selection/selectedNodes'] = [{ allowedActions: { canCollapse: 'false' } }];
                expect(workflowShortcuts[shortcut].condition({ $store })).toBe(false);
            });

            it(`it can not create ${nodeKind} when workflow is not writable`, () => {
                const { $store } = createStore({
                    isWorkflowWritable: false,
                    selectedNodes: [{ allowedActions: { canCollapse: 'true' } }]
                });

                expect(workflowShortcuts[shortcut].condition({ $store })).toBe(false);
            });

            it(`it can not create ${nodeKind} when no node is selected`, () => {
                const { $store } = createStore({ isWorkflowWritable: false });
                expect(workflowShortcuts[shortcut].condition({ $store })).toBe(false);
            });
        });

        describe.each([
            ['component'],
            ['metanode']
        ])('expand %s', (nodeKind) => {
            const shortcut = `expand${capitalize(nodeKind)}`;

            it(`it allows to expand if a ${nodeKind} is selected and canExpand is true`, () => {
                const { $store } = createStore({
                    singleSelectedNode: {
                        kind: nodeKind,
                        allowedActions: {
                            canExpand: 'false'
                        }
                    }
                });

                expect(workflowShortcuts[shortcut].condition({ $store })).toBe(false);
                $store.getters['selection/singleSelectedNode'] = {
                    kind: nodeKind,
                    allowedActions: {
                        canExpand: 'true'
                    }
                };
                expect(workflowShortcuts[shortcut].condition({ $store })).toBe(true);
            });

            it(`it can not expand ${nodeKind} when workflow is not writable`, () => {
                const { $store } = createStore({
                    isWorkflowWritable: false,
                    singleSelectedNode: {
                        kind: nodeKind,
                        allowedActions: {
                            canExpand: 'true'
                        }
                    }
                });

                expect(workflowShortcuts[shortcut].condition({ $store })).toBe(false);
            });

            it(`it can not expand ${nodeKind} when the metanode is linked`, () => {
                const { $store } = createStore({
                    singleSelectedNode: {
                        kind: nodeKind,
                        link: 'random-link',
                        allowedActions: {
                            canExpand: 'true'
                        }
                    }
                });

                expect(workflowShortcuts.expandMetanode.condition({ $store })).toBe(false);
            });
        });

        describe('openLayoutEditor', () => {
            it('it is not a component, button disabled', () => {
                const { $store } = createStore();
                expect(workflowShortcuts.openLayoutEditor.condition({ $store })).toBeFalsy();
            });

            it('it is not a writable component, button disabled', () => {
                const { $store } = createStore({
                    isWorkflowWritable: false,
                    containerType: 'component'
                });

                expect(workflowShortcuts.openLayoutEditor.condition({ $store })).toBeFalsy();
            });

            it('it is a writable component, button enabled', () => {
                const { $store } = createStore({
                    isWorkflowWritable: true,
                    containerType: 'component'
                });
                expect(workflowShortcuts.openLayoutEditor.condition({ $store })).toBe(true);
            });
        });

        it('copy', () => {
            // mock kanvas element and make it the activeElement
            document.body.innerHTML = '<div id="kanvas" tabindex="0"></div>';
            const kanvasElement = document.getElementById('kanvas');
            kanvasElement.focus();
            expect(document.activeElement).toBe(kanvasElement);
            let getScrollContainerElement = vi.fn().mockReturnValue(kanvasElement);

            const { $store } = createStore({ getScrollContainerElement });

            expect(workflowShortcuts.copy.condition({ $store })).toBeFalsy();
            $store.getters['selection/selectedNodes'] = [{ allowedActions: {} }];

            expect(workflowShortcuts.copy.condition({ $store })).toBe(true);
            $store.state.application.hasClipboardSupport = false;
            expect(workflowShortcuts.copy.condition({ $store })).toBeFalsy();

            getScrollContainerElement.mockReturnValue({});
            expect(workflowShortcuts.copy.condition({ $store })).toBeFalsy();
        });

        describe('cut', () => {
            it('nothing selected, not writeable -> disabled', () => {
                const { $store } = createStore();
                expect(workflowShortcuts.cut.condition({ $store })).toBeFalsy();
            });

            it('nodes selected, not writeable -> disabled', () => {
                const { $store } = createStore({
                    selectedNodes: [{ allowedActions: {} }],
                    isWorkflowWritable: false
                });

                expect(workflowShortcuts.cut.condition({ $store })).toBeFalsy();
            });

            it('nothing selected, writeable -> disabled', () => {
                const { $store } = createStore({ isWorkflowWritable: true });

                expect(workflowShortcuts.cut.condition({ $store })).toBeFalsy();
            });

            it('nodes selected, writeable -> enabled', () => {
                const { $store } = createStore({
                    selectedNodes: [{ allowedActions: {} }],
                    isWorkflowWritable: true
                });
                expect(workflowShortcuts.cut.condition({ $store })).toBe(true);
            });

            it('nodes selected, writeable but no clipboard permission -> disabled', () => {
                const { $store } = createStore({
                    selectedNodes: [{ allowedActions: {} }],
                    isWorkflowWritable: true
                });
                $store.state.application.hasClipboardSupport = false;

                expect(workflowShortcuts.cut.condition({ $store })).toBeFalsy();
            });
        });

        it('paste', () => {
            const { $store } = createStore({
                selectedNodes: [{ allowedActions: {} }],
                isWorkflowWritable: false
            });

            expect(workflowShortcuts.paste.condition({ $store })).toBeFalsy();
            $store.getters['workflow/isWritable'] = true;

            expect(workflowShortcuts.paste.condition({ $store })).toBe(true);

            $store.state.application.hasClipboardSupport = false;
            expect(workflowShortcuts.paste.condition({ $store })).toBeFalsy();
        });

        it.each([
            ['bringAnnotationToFront'],
            ['bringAnnotationForward'],
            ['sendAnnotationBackward'],
            ['sendAnnotationToBack']
        ])('should check selected annotations when trying to %s', (shortcutName) => {
            const { $store } = createStore();

            expect(workflowShortcuts[shortcutName].condition({ $store })).toBe(false);

            $store.getters['selection/selectedAnnotations'] = [{ id: 'mock-annotation' }];
            expect(workflowShortcuts[shortcutName].condition({ $store })).toBe(true);
        });

        describe('quickAddNode', () => {
            it.each([['enables', true], ['disables', false]])('%s menu if workflow is writeable or not', (_, cond) => {
                const { $store } = createStore({
                    isWorkflowWritable: cond,
                    singleSelectedNode: null
                });
                expect(workflowShortcuts.quickAddNode.condition({ $store })).toBe(cond);
            });

            it('opens quick add node menu in global mode if no node is selected', () => {
                const { $store, mockDispatch } = createStore({
                    isWorkflowWritable: true,
                    singleSelectedNode: null
                });
                workflowShortcuts.quickAddNode.execute({ $store });
                expect(mockDispatch).toHaveBeenCalledWith('workflow/openQuickAddNodeMenu', {
                    props: {
                        position: expect.anything()
                    }
                });
            });

            const mockNodeTemplate = (length) => ({
                id: 'root:4',
                position: { x: 120, y: 53 },
                kind: 'node',
                outPorts: Array.from({ length }, (_, index) => ({ index, typeId: 'some.type' }))
            });

            it('opens quick add node menu on the mickey mouse ports if no others are available', () => {
                const { $store, mockDispatch } = createStore({
                    isWorkflowWritable: true,
                    singleSelectedNode: mockNodeTemplate(1)
                });
                workflowShortcuts.quickAddNode.execute({ $store });
                expect(mockDispatch).toHaveBeenCalledWith('workflow/openQuickAddNodeMenu', {
                    props: {
                        nodeId: 'root:4',
                        port: { index: 0, typeId: 'some.type' },
                        position: expect.anything()
                    }
                });
            });

            it('opens quick add node menu on first none mickey mouse ports', () => {
                const { $store, mockDispatch } = createStore({
                    isWorkflowWritable: true,
                    singleSelectedNode: mockNodeTemplate(3)
                });
                workflowShortcuts.quickAddNode.execute({ $store });
                expect(mockDispatch).toHaveBeenCalledWith('workflow/openQuickAddNodeMenu', {
                    props: {
                        nodeId: 'root:4',
                        port: { index: 1, typeId: 'some.type' },
                        position: expect.anything()
                    }
                });
            });

            it('switch to the next port and reuse current position if menu was already open', () => {
                const { $store, mockDispatch } = createStore({
                    isWorkflowWritable: true,
                    getNodeById: vi.fn().mockReturnValue(mockNodeTemplate(3)),
                    singleSelectedNode: mockNodeTemplate(3)
                });
                $store.state.workflow.quickAddNodeMenu = {
                    isOpen: true,
                    props: {
                        nodeId: 'root:4',
                        port: {
                            index: 1
                        },
                        position: { x: 5, y: 8 }
                    }
                };
                workflowShortcuts.quickAddNode.execute({ $store });
                expect(mockDispatch).toHaveBeenCalledWith('workflow/openQuickAddNodeMenu', {
                    props: {
                        nodeId: 'root:4',
                        port: { index: 2, typeId: 'some.type' },
                        position: { x: 5, y: 8 }
                    }
                });
            });
        });
    });
});
