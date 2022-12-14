import workflowShortcuts from '../workflowShortcuts';

const capitalize = (str) => str.charAt(0).toUpperCase().concat(str.slice(1));

describe('workflowShortcuts', () => {
    const mockSelectedNode = { id: 'root:0', allowedActions: {} };

    const createStore = ({
        containerType = 'project',
        selectedNodes = [],
        selectedConnections = [],
        singleSelectedNode = mockSelectedNode,
        isWorkflowWritable = true
    } = {}) => {
        const mockDispatch = jest.fn();
        const $store = {
            dispatch: mockDispatch,
            state: {
                application: {
                    hasClipboardSupport: true
                },
                workflow: {
                    activeWorkflow: {
                        allowedActions: {},
                        info: {
                            containerType
                        }
                    }
                }
            },
            getters: {
                'selection/selectedNodes': selectedNodes,
                'selection/selectedConnections': selectedConnections,
                'selection/singleSelectedNode': singleSelectedNode,
                'workflow/isWritable': isWorkflowWritable
            }
        };

        return { mockDispatch, $store };
    };

    describe('execute', () => {
        test('save', () => {
            const { $store, mockDispatch } = createStore();
            workflowShortcuts.save.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/saveWorkflow');
        });

        test('undo', () => {
            const { $store, mockDispatch } = createStore();
            workflowShortcuts.undo.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/undo');
        });

        test('redo', () => {
            const { $store, mockDispatch } = createStore();
            workflowShortcuts.redo.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/redo');
        });

        test('configureNode', () => {
            const { $store, mockDispatch } = createStore();
            workflowShortcuts.configureNode.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/openNodeConfiguration', 'root:0');
        });

        test('configureFlowVariables', () => {
            const { $store, mockDispatch } = createStore();
            workflowShortcuts.configureFlowVariables.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/openFlowVariableConfiguration', 'root:0');
        });

        test('openView', () => {
            const { $store, mockDispatch } = createStore();
            workflowShortcuts.openView.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/openView', 'root:0');
        });

        test('editName', () => {
            const { $store, mockDispatch } = createStore();
            workflowShortcuts.editName.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/openNameEditor', 'root:0');
        });

        test('editNodeLabel', () => {
            const { $store, mockDispatch } = createStore();
            workflowShortcuts.editNodeLabel.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/openLabelEditor', 'root:0');
        });

        test('deleteSelected', () => {
            const { $store, mockDispatch } = createStore();
            workflowShortcuts.deleteSelected.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/deleteSelectedObjects');
        });

        test('create metanode', () => {
            const { $store, mockDispatch } = createStore();
            workflowShortcuts.createMetanode.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/collapseToContainer', { containerType: 'metanode' });
        });

        test('create component', () => {
            const { $store, mockDispatch } = createStore();
            workflowShortcuts.createComponent.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/collapseToContainer', { containerType: 'component' });
        });

        test('expand container node', () => {
            const { $store, mockDispatch } = createStore();
            workflowShortcuts.expandMetanode.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/expandContainerNode');
        });

        test('open layout editor', () => {
            const { $store, mockDispatch } = createStore();
            workflowShortcuts.openLayoutEditor.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/openLayoutEditor');
        });

        test('copy', () => {
            const { $store, mockDispatch } = createStore();
            workflowShortcuts.copy.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/copyOrCutWorkflowParts', { command: 'copy' });
        });

        test('cut', () => {
            const { $store, mockDispatch } = createStore();
            workflowShortcuts.cut.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/copyOrCutWorkflowParts', { command: 'cut' });
        });

        test('paste', () => {
            const { $store, mockDispatch } = createStore();
            workflowShortcuts.paste.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/pasteWorkflowParts', expect.anything());
        });
    });

    describe('condition', () => {
        test('save', () => {
            const { $store } = createStore();
            expect(workflowShortcuts.save.condition({ $store })).toBeFalsy();
            $store.state.workflow.activeWorkflow.dirty = true;
            expect(workflowShortcuts.save.condition({ $store })).toBe(true);
        });

        test('undo', () => {
            const { $store } = createStore();
            expect(workflowShortcuts.undo.condition({ $store })).toBeFalsy();
            $store.state.workflow.activeWorkflow.allowedActions.canUndo = true;
            expect(workflowShortcuts.undo.condition({ $store })).toBe(true);
        });

        test('redo', () => {
            const { $store } = createStore();
            expect(workflowShortcuts.redo.condition({ $store })).toBeFalsy();
            $store.state.workflow.activeWorkflow.allowedActions.canRedo = true;
            expect(workflowShortcuts.redo.condition({ $store })).toBe(true);
        });

        test('configureNode', () => {
            const { $store } = createStore();
            expect(workflowShortcuts.configureNode.condition({ $store })).toBeFalsy();
            $store.getters['selection/singleSelectedNode'].allowedActions = { canOpenDialog: true };
            expect(workflowShortcuts.configureNode.condition({ $store })).toBe(true);
        });

        test('configureFlowVariables', () => {
            const { $store } = createStore();
            expect(workflowShortcuts.configureFlowVariables.condition({ $store })).toBeFalsy();
            $store.getters['selection/singleSelectedNode'].allowedActions = {
                canOpenLegacyFlowVariableDialog: true
            };
            expect(workflowShortcuts.configureFlowVariables.condition({ $store })).toBe(true);
        });

        test('openView', () => {
            const { $store } = createStore();
            expect(workflowShortcuts.openView.condition({ $store })).toBeFalsy();
            $store.getters['selection/singleSelectedNode'].allowedActions = {
                canOpenView: true
            };
            expect(workflowShortcuts.openView.condition({ $store })).toBe(true);
        });

        describe('editName', () => {
            test('cannot rename when workflow is not writable', () => {
                const { $store } = createStore();
                $store.getters['selection/singleSelectedNode'].kind = 'component';
                $store.getters['workflow/isWritable'] = false;

                expect(workflowShortcuts.editName.condition({ $store })).toBe(false);
            });

            test.each([
                ['component', true],
                ['metanode', true],
                ['node', false]
            ])('for nodes of kind: "%s" the condition should be "%s"', (kind, conditionValue) => {
                const { $store } = createStore();
                $store.getters['workflow/isWritable'] = true;
                $store.getters['selection/singleSelectedNode'].kind = kind;

                expect(workflowShortcuts.editName.condition({ $store })).toBe(conditionValue);
            });

            test('cannot rename if the selected node is linked', () => {
                const { $store } = createStore();
                $store.getters['workflow/isWritable'] = true;
                $store.getters['selection/singleSelectedNode'].kind = 'component';
                $store.getters['selection/singleSelectedNode'].link = true;

                expect(workflowShortcuts.editName.condition({ $store })).toBe(false);
            });
        });

        describe('editNodeLabel', () => {
            test('cannot edit label if no node is selected', () => {
                const { $store } = createStore({
                    isWorkflowWritable: true,
                    singleSelectedNode: null
                });

                expect(workflowShortcuts.editNodeLabel.condition({ $store })).toBe(false);
            });

            test('cannot edit label when workflow is not writable', () => {
                const { $store } = createStore({
                    isWorkflowWritable: false,
                    singleSelectedNode: {
                        kind: 'node',
                        id: 'node1'
                    }
                });

                expect(workflowShortcuts.editNodeLabel.condition({ $store })).toBe(false);
            });

            test('cannot edit label if the selected node is linked', () => {
                const { $store } = createStore({
                    isWorkflowWritable: true,
                    singleSelectedNode: {
                        kind: 'node',
                        id: 'node1',
                        link: true
                    }
                });

                expect(workflowShortcuts.editName.condition({ $store })).toBe(false);
            });
        });

        describe('deleteSelected', () => {
            test('is not writeable ', () => {
                const { $store } = createStore({ singleSelectedNode: null });
                $store.getters['workflow/isWritable'] = false;
                expect(workflowShortcuts.deleteSelected.condition({ $store })).toBe(false);
            });

            test('nothing selected', () => {
                const { $store } = createStore({ singleSelectedNode: null });
                $store.getters['selection/selectedNodes'] = [];
                $store.getters['selection/selectedConnections'] = [];
                expect(workflowShortcuts.deleteSelected.condition({ $store })).toBe(false);
            });

            test('one node is not deletable', () => {
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

            test('one connection is not deletable', () => {
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

            test('all selected are deletable', () => {
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

            test('only nodes are selected', () => {
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

            test(`it can not create ${nodeKind} when canCollapse is false`, () => {
                const { $store } = createStore({
                    selectedNodes: [{ allowedActions: { canCollapse: 'true' } }]
                });
                
                expect(workflowShortcuts[shortcut].condition({ $store })).toBe(true);
                
                $store.getters['selection/selectedNodes'] = [{ allowedActions: { canCollapse: 'false' } }];
                expect(workflowShortcuts[shortcut].condition({ $store })).toBe(false);
            });

            test(`it can not create ${nodeKind} when workflow is not writable`, () => {
                const { $store } = createStore({
                    isWorkflowWritable: false,
                    selectedNodes: [{ allowedActions: { canCollapse: 'true' } }]
                });
               
                expect(workflowShortcuts[shortcut].condition({ $store })).toBe(false);
            });

            test(`it can not create ${nodeKind} when no node is selected`, () => {
                const { $store } = createStore({ isWorkflowWritable: false });
                expect(workflowShortcuts[shortcut].condition({ $store })).toBe(false);
            });
        });

        describe.each([
            ['component'],
            ['metanode']
        ])('expand %s', (nodeKind) => {
            const shortcut = `expand${capitalize(nodeKind)}`;

            test(`it allows to expand if a ${nodeKind} is selected and canExpand is true`, () => {
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

            test(`it can not expand ${nodeKind} when workflow is not writable`, () => {
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
            
            test(`it can not expand ${nodeKind} when the metanode is linked`, () => {
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
            test('it is not a component, button disabled', () => {
                const { $store } = createStore();
                expect(workflowShortcuts.openLayoutEditor.condition({ $store })).toBeFalsy();
            });

            test('it is not a writable component, button disabled', () => {
                const { $store } = createStore({
                    isWorkflowWritable: false,
                    containerType: 'component'
                });
                
                expect(workflowShortcuts.openLayoutEditor.condition({ $store })).toBeFalsy();
            });

            test('it is a writable component, button enabled', () => {
                const { $store } = createStore({
                    isWorkflowWritable: true,
                    containerType: 'component'
                });
                expect(workflowShortcuts.openLayoutEditor.condition({ $store })).toBe(true);
            });
        });

        test('copy', () => {
            const { $store } = createStore();

            expect(workflowShortcuts.copy.condition({ $store })).toBeFalsy();
            $store.getters['selection/selectedNodes'] = [{ allowedActions: {} }];
            
            expect(workflowShortcuts.copy.condition({ $store })).toBe(true);
            $store.state.application.hasClipboardSupport = false;
            expect(workflowShortcuts.copy.condition({ $store })).toBeFalsy();
        });

        describe('cut', () => {
            test('nothing selected, not writeable -> disabled', () => {
                const { $store } = createStore();
                expect(workflowShortcuts.cut.condition({ $store })).toBeFalsy();
            });

            test('nodes selected, not writeable -> disabled', () => {
                const { $store } = createStore({
                    selectedNodes: [{ allowedActions: {} }],
                    isWorkflowWritable: false
                });

                expect(workflowShortcuts.cut.condition({ $store })).toBeFalsy();
            });

            test('nothing selected, writeable -> disabled', () => {
                const { $store } = createStore({ isWorkflowWritable: true });
                
                expect(workflowShortcuts.cut.condition({ $store })).toBeFalsy();
            });

            test('nodes selected, writeable -> enabled', () => {
                const { $store } = createStore({
                    selectedNodes: [{ allowedActions: {} }],
                    isWorkflowWritable: true
                });
                expect(workflowShortcuts.cut.condition({ $store })).toBe(true);
            });

            test('nodes selected, writeable but no clipboard permission -> disabled', () => {
                const { $store } = createStore({
                    selectedNodes: [{ allowedActions: {} }],
                    isWorkflowWritable: true
                });
                $store.state.application.hasClipboardSupport = false;
               
                expect(workflowShortcuts.cut.condition({ $store })).toBeFalsy();
            });
        });

        test('paste', () => {
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
    });
});
