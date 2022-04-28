import workflowCommands from '~/commands/workflowCommands';


describe('workflowCommands', () => {
    let mockDispatch, $store;

    beforeEach(() => {
        mockDispatch = jest.fn();
        $store = {
            dispatch: mockDispatch,
            state: {
                workflow: {
                    activeWorkflow: {
                        allowedActions: {}
                    }
                }
            },
            getters: {
                'selection/selectedNodes': [],
                'selection/selectedConnections': [],
                'selection/singleSelectedNode': { id: 'root:0', allowedActions: {} },
                'workflow/isWritable': false
            }
        };
    });

    describe('execute', () => {
        test('save', () => {
            workflowCommands.save.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/saveWorkflow');
        });

        test('undo', () => {
            workflowCommands.undo.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/undo');
        });

        test('redo', () => {
            workflowCommands.redo.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/redo');
        });

        test('configureNode', () => {
            workflowCommands.configureNode.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/openDialog', 'root:0');
        });

        test('configureFlowVariables', () => {
            workflowCommands.configureFlowVariables.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/configureFlowVariables', 'root:0');
        });

        test('openView', () => {
            workflowCommands.openView.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/openView', 'root:0');
        });

        test('editName', () => {
            workflowCommands.editName.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/openNameEditor', 'root:0');
        });

        test('deleteSelected', () => {
            workflowCommands.deleteSelected.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/deleteSelectedObjects');
        });
    });

    describe('condition', () => {
        test('save', () => {
            expect(workflowCommands.save.condition({ $store })).toBeFalsy();
            $store.state.workflow.activeWorkflow.dirty = true;
            expect(workflowCommands.save.condition({ $store })).toBe(true);
        });

        test('undo', () => {
            expect(workflowCommands.undo.condition({ $store })).toBeFalsy();
            $store.state.workflow.activeWorkflow.allowedActions.canUndo = true;
            expect(workflowCommands.undo.condition({ $store })).toBe(true);
        });

        test('redo', () => {
            expect(workflowCommands.redo.condition({ $store })).toBeFalsy();
            $store.state.workflow.activeWorkflow.allowedActions.canRedo = true;
            expect(workflowCommands.redo.condition({ $store })).toBe(true);
        });

        test('configureNode', () => {
            expect(workflowCommands.configureNode.condition({ $store })).toBeFalsy();
            $store.getters['selection/singleSelectedNode'].allowedActions = { canOpenDialog: true };
            expect(workflowCommands.configureNode.condition({ $store })).toBe(true);
        });

        test('configureFlowVariables', () => {
            expect(workflowCommands.configureFlowVariables.condition({ $store })).toBeFalsy();
            $store.getters['selection/singleSelectedNode'].allowedActions = {
                canOpenLegacyFlowVariableDialog: true
            };
            expect(workflowCommands.configureFlowVariables.condition({ $store })).toBe(true);
        });

        test('openView', () => {
            expect(workflowCommands.openView.condition({ $store })).toBeFalsy();
            $store.getters['selection/singleSelectedNode'].allowedActions = {
                canOpenView: true
            };
            expect(workflowCommands.openView.condition({ $store })).toBe(true);
        });

        describe('editName', () => {
            test('cannot rename when workflow is not writable', () => {
                $store.getters['selection/singleSelectedNode'].kind = 'component';
                $store.getters['workflow/isWritable'] = false;

                expect(workflowCommands.editName.condition({ $store })).toBe(false);
            });

            test.each([
                ['component', true],
                ['metanode', true],
                ['node', false]
            ])('for nodes of kind: "%s" the condition should be "%s"', (kind, conditionValue) => {
                $store.getters['workflow/isWritable'] = true;
                $store.getters['selection/singleSelectedNode'].kind = kind;

                expect(workflowCommands.editName.condition({ $store })).toBe(conditionValue);
            });

            test('cannot rename if the selected node is linked', () => {
                $store.getters['workflow/isWritable'] = true;
                $store.getters['selection/singleSelectedNode'].kind = 'component';
                $store.getters['selection/singleSelectedNode'].link = true;

                expect(workflowCommands.editName.condition({ $store })).toBe(false);
            });
        });

        describe('deleteSelected', () => {
            beforeEach(() => {
                $store.getters['selection/singleSelectedNode'] = null;
            });

            test('is not writeable ', () => {
                $store.getters['workflow/isWritable'] = false;
                expect(workflowCommands.deleteSelected.condition({ $store })).toBe(false);
            });

            test('nothing selected', () => {
                $store.getters['selection/selectedNodes'] = [];
                $store.getters['selection/selectedConnections'] = [];
                expect(workflowCommands.deleteSelected.condition({ $store })).toBe(false);
            });

            test('one node is not deletable', () => {
                $store.getters['selection/selectedNodes'] = [{ allowedActions: { canDelete: true } },
                    { allowedActions: { canDelete: false } }];
                $store.getters['selection/selectedConnections'] = [{ allowedActions: { canDelete: true } }];
                expect(workflowCommands.deleteSelected.condition({ $store })).toBe(false);
            });

            test('one connnection is not deletable', () => {
                $store.getters['selection/selectedNodes'] = [{ allowedActions: { canDelete: true } },
                    { allowedActions: { canDelete: true } }];
                $store.getters['selection/selectedConnections'] = [{ allowedActions: { canDelete: true } },
                    { allowedActions: { canDelete: false } }];
                expect(workflowCommands.deleteSelected.condition({ $store })).toBe(false);
            });

            test('all selected are deletable', () => {
                $store.getters['selection/selectedNodes'] = [{ allowedActions: { canDelete: true } },
                    { allowedActions: { canDelete: true } }];
                $store.getters['selection/selectedConnections'] = [{ allowedActions: { canDelete: true } },
                    { allowedActions: { canDelete: true } }];
                expect(workflowCommands.deleteSelected.condition({ $store })).toBe(true);
            });

            test('only nodes are selected', () => {
                $store.getters['selection/selectedNodes'] = [{ allowedActions: { canDelete: true } },
                    { allowedActions: { canDelete: true } }];
                $store.getters['selection/selectedConnections'] = [];
                expect(workflowCommands.deleteSelected.condition({ $store })).toBe(true);
            });
        });
    });
});
