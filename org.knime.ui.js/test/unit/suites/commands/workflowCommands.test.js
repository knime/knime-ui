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
                        allowedActions: {},
                        info: {
                            containerType: 'project'
                        }
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

        test('create metanode', () => {
            workflowCommands.createMetanode.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/collapseToContainer', { containerType: 'metanode' });
        });

        test('create component', () => {
            workflowCommands.createComponent.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/collapseToContainer', { containerType: 'component' });
        });

        test('expand container node', () => {
            workflowCommands.expandMetanode.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/expandContainerNode');
        });

        test('open layout editor', () => {
            workflowCommands.openLayoutEditor.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/openLayoutEditor');
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
                $store.getters['workflow/isWritable'] = true;
                $store.getters['selection/selectedNodes'] = [{ allowedActions: { canDelete: true } },
                    { allowedActions: { canDelete: true } }];
                $store.getters['selection/selectedConnections'] = [{ allowedActions: { canDelete: true } },
                    { allowedActions: { canDelete: true } }];
                expect(workflowCommands.deleteSelected.condition({ $store })).toBe(true);
            });

            test('only nodes are selected', () => {
                $store.getters['workflow/isWritable'] = true;
                $store.getters['selection/selectedNodes'] = [{ allowedActions: { canDelete: true } },
                    { allowedActions: { canDelete: true } }];
                $store.getters['selection/selectedConnections'] = [];
                expect(workflowCommands.deleteSelected.condition({ $store })).toBe(true);
            });
        });

        describe('createMetanode', () => {
            test('it can not create metanode when canCollapse is false', () => {
                $store.getters['workflow/isWritable'] = true;
                expect(workflowCommands.createMetanode.condition({ $store })).toBe(true);
                $store.getters['selection/selectedNodes'] = [{ allowedActions: { canCollapse: 'false' } }];
                expect(workflowCommands.createMetanode.condition({ $store })).toBe(false);
            });

            test('it can not create metanode when workflow is not writable', () => {
                $store.getters['workflow/isWritable'] = false;
                expect(workflowCommands.createMetanode.condition({ $store })).toBe(false);
            });
        });


        describe('createComponent', () => {
            test('it can not create component when canCollapse is false', () => {
                $store.getters['workflow/isWritable'] = true;
                expect(workflowCommands.createComponent.condition({ $store })).toBe(true);
                $store.getters['selection/selectedNodes'] = [{ allowedActions: { canCollapse: 'false' } }];
                expect(workflowCommands.createComponent.condition({ $store })).toBe(false);
            });

            test('it can not create component when workflow is not writable', () => {
                $store.getters['workflow/isWritable'] = false;
                expect(workflowCommands.createComponent.condition({ $store })).toBe(false);
            });
        });

        describe('expandMetanode', () => {
            test('it allows to expand if a metanode is selected and canExpand is true', () => {
                $store.getters['workflow/isWritable'] = true;
                $store.getters['selection/singleSelectedNode'] = {
                    kind: 'component',
                    allowedActions: {
                        canExpand: 'true'
                    }
                };
                expect(workflowCommands.expandMetanode.condition({ $store })).toBe(false);
                $store.getters['selection/singleSelectedNode'] = {
                    kind: 'metanode',
                    allowedActions: {
                        canExpand: 'true'
                    }
                };
                expect(workflowCommands.expandMetanode.condition({ $store })).toBe(true);
            });

            test('it can not expand metanode when workflow is not writable', () => {
                $store.getters['workflow/isWritable'] = false;
                $store.getters['selection/singleSelectedNode'] = {
                    kind: 'metanode',
                    allowedActions: {
                        canExpand: 'true'
                    }
                };
                expect(workflowCommands.expandMetanode.condition({ $store })).toBe(false);
            });
        });

        describe('expandComponent', () => {
            test('it allows to expand if a component is selected and canExpand is true', () => {
                $store.getters['workflow/isWritable'] = true;
                $store.getters['selection/singleSelectedNode'] = {
                    kind: 'metanode',
                    allowedActions: {
                        canExpand: 'true'
                    }
                };
                expect(workflowCommands.expandComponent.condition({ $store })).toBe(false);
                $store.getters['selection/singleSelectedNode'] = {
                    kind: 'component',
                    allowedActions: {
                        canExpand: 'true'
                    }
                };
                expect(workflowCommands.expandComponent.condition({ $store })).toBe(true);
            });

            test('it can not expand component when workflow is not writable', () => {
                $store.getters['workflow/isWritable'] = false;
                $store.getters['selection/singleSelectedNode'] = {
                    kind: 'component',
                    allowedActions: {
                        canExpand: 'true'
                    }
                };
                expect(workflowCommands.expandComponent.condition({ $store })).toBe(false);
            });
        });

        describe('openLayoutEditor', () => {
            test('it is not a component, button disabled', () => {
                expect(workflowCommands.openLayoutEditor.condition({ $store })).toBeFalsy();
            });

            test('it is not a writable component, button disabled', () => {
                $store.state.workflow.activeWorkflow.info.containerType = 'component';
                $store.getters['workflow/isWritable'] = false;
                expect(workflowCommands.openLayoutEditor.condition({ $store })).toBeFalsy();
            });

            test('it is a writable component, button enabled', () => {
                $store.state.workflow.activeWorkflow.info.containerType = 'component';
                $store.getters['workflow/isWritable'] = true;
                expect(workflowCommands.openLayoutEditor.condition({ $store })).toBe(true);
            });
        });
    });
});
