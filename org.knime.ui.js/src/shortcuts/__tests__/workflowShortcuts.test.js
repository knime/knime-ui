import workflowShortcuts from '../workflowShortcuts';

describe('workflowShortcuts', () => {
    let mockDispatch, $store;

    beforeEach(() => {
        mockDispatch = jest.fn();
        $store = {
            dispatch: mockDispatch,
            state: {
                application: {
                    hasClipboardSupport: true
                },
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
            workflowShortcuts.save.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/saveWorkflow');
        });

        test('undo', () => {
            workflowShortcuts.undo.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/undo');
        });

        test('redo', () => {
            workflowShortcuts.redo.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/redo');
        });

        test('configureNode', () => {
            workflowShortcuts.configureNode.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/openNodeConfiguration', 'root:0');
        });

        test('configureFlowVariables', () => {
            workflowShortcuts.configureFlowVariables.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/openFlowVariableConfiguration', 'root:0');
        });

        test('openView', () => {
            workflowShortcuts.openView.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/openView', 'root:0');
        });

        test('editName', () => {
            workflowShortcuts.editName.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/openNameEditor', 'root:0');
        });

        test('deleteSelected', () => {
            workflowShortcuts.deleteSelected.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/deleteSelectedObjects');
        });

        test('create metanode', () => {
            workflowShortcuts.createMetanode.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/collapseToContainer', { containerType: 'metanode' });
        });

        test('create component', () => {
            workflowShortcuts.createComponent.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/collapseToContainer', { containerType: 'component' });
        });

        test('expand container node', () => {
            workflowShortcuts.expandMetanode.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/expandContainerNode');
        });

        test('open layout editor', () => {
            workflowShortcuts.openLayoutEditor.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/openLayoutEditor');
        });

        test('copy', () => {
            workflowShortcuts.copy.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/copyOrCutWorkflowParts', { command: 'copy' });
        });

        test('cut', () => {
            workflowShortcuts.cut.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/copyOrCutWorkflowParts', { command: 'cut' });
        });

        test('paste', () => {
            workflowShortcuts.paste.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('workflow/pasteWorkflowParts', expect.anything());
        });
    });

    describe('condition', () => {
        test('save', () => {
            expect(workflowShortcuts.save.condition({ $store })).toBeFalsy();
            $store.state.workflow.activeWorkflow.dirty = true;
            expect(workflowShortcuts.save.condition({ $store })).toBe(true);
        });

        test('undo', () => {
            expect(workflowShortcuts.undo.condition({ $store })).toBeFalsy();
            $store.state.workflow.activeWorkflow.allowedActions.canUndo = true;
            expect(workflowShortcuts.undo.condition({ $store })).toBe(true);
        });

        test('redo', () => {
            expect(workflowShortcuts.redo.condition({ $store })).toBeFalsy();
            $store.state.workflow.activeWorkflow.allowedActions.canRedo = true;
            expect(workflowShortcuts.redo.condition({ $store })).toBe(true);
        });

        test('configureNode', () => {
            expect(workflowShortcuts.configureNode.condition({ $store })).toBeFalsy();
            $store.getters['selection/singleSelectedNode'].allowedActions = { canOpenDialog: true };
            expect(workflowShortcuts.configureNode.condition({ $store })).toBe(true);
        });

        test('configureFlowVariables', () => {
            expect(workflowShortcuts.configureFlowVariables.condition({ $store })).toBeFalsy();
            $store.getters['selection/singleSelectedNode'].allowedActions = {
                canOpenLegacyFlowVariableDialog: true
            };
            expect(workflowShortcuts.configureFlowVariables.condition({ $store })).toBe(true);
        });

        test('openView', () => {
            expect(workflowShortcuts.openView.condition({ $store })).toBeFalsy();
            $store.getters['selection/singleSelectedNode'].allowedActions = {
                canOpenView: true
            };
            expect(workflowShortcuts.openView.condition({ $store })).toBe(true);
        });

        describe('editName', () => {
            test('cannot rename when workflow is not writable', () => {
                $store.getters['selection/singleSelectedNode'].kind = 'component';
                $store.getters['workflow/isWritable'] = false;

                expect(workflowShortcuts.editName.condition({ $store })).toBe(false);
            });

            test.each([
                ['component', true],
                ['metanode', true],
                ['node', false]
            ])('for nodes of kind: "%s" the condition should be "%s"', (kind, conditionValue) => {
                $store.getters['workflow/isWritable'] = true;
                $store.getters['selection/singleSelectedNode'].kind = kind;

                expect(workflowShortcuts.editName.condition({ $store })).toBe(conditionValue);
            });

            test('cannot rename if the selected node is linked', () => {
                $store.getters['workflow/isWritable'] = true;
                $store.getters['selection/singleSelectedNode'].kind = 'component';
                $store.getters['selection/singleSelectedNode'].link = true;

                expect(workflowShortcuts.editName.condition({ $store })).toBe(false);
            });
        });

        describe('deleteSelected', () => {
            beforeEach(() => {
                $store.getters['selection/singleSelectedNode'] = null;
            });

            test('is not writeable ', () => {
                $store.getters['workflow/isWritable'] = false;
                expect(workflowShortcuts.deleteSelected.condition({ $store })).toBe(false);
            });

            test('nothing selected', () => {
                $store.getters['selection/selectedNodes'] = [];
                $store.getters['selection/selectedConnections'] = [];
                expect(workflowShortcuts.deleteSelected.condition({ $store })).toBe(false);
            });

            test('one node is not deletable', () => {
                $store.getters['selection/selectedNodes'] = [{ allowedActions: { canDelete: true } },
                    { allowedActions: { canDelete: false } }];
                $store.getters['selection/selectedConnections'] = [{ allowedActions: { canDelete: true } }];
                expect(workflowShortcuts.deleteSelected.condition({ $store })).toBe(false);
            });

            test('one connnection is not deletable', () => {
                $store.getters['selection/selectedNodes'] = [{ allowedActions: { canDelete: true } },
                    { allowedActions: { canDelete: true } }];
                $store.getters['selection/selectedConnections'] = [{ allowedActions: { canDelete: true } },
                    { allowedActions: { canDelete: false } }];
                expect(workflowShortcuts.deleteSelected.condition({ $store })).toBe(false);
            });

            test('all selected are deletable', () => {
                $store.getters['workflow/isWritable'] = true;
                $store.getters['selection/selectedNodes'] = [{ allowedActions: { canDelete: true } },
                    { allowedActions: { canDelete: true } }];
                $store.getters['selection/selectedConnections'] = [{ allowedActions: { canDelete: true } },
                    { allowedActions: { canDelete: true } }];
                expect(workflowShortcuts.deleteSelected.condition({ $store })).toBe(true);
            });

            test('only nodes are selected', () => {
                $store.getters['workflow/isWritable'] = true;
                $store.getters['selection/selectedNodes'] = [{ allowedActions: { canDelete: true } },
                    { allowedActions: { canDelete: true } }];
                $store.getters['selection/selectedConnections'] = [];
                expect(workflowShortcuts.deleteSelected.condition({ $store })).toBe(true);
            });
        });

        describe('createMetanode', () => {
            test('it can not create metanode when canCollapse is false', () => {
                $store.getters['workflow/isWritable'] = true;
                $store.getters['selection/selectedNodes'] = [{ allowedActions: { canCollapse: 'true' } }];
                expect(workflowShortcuts.createMetanode.condition({ $store })).toBe(true);
                $store.getters['selection/selectedNodes'] = [{ allowedActions: { canCollapse: 'false' } }];
                expect(workflowShortcuts.createMetanode.condition({ $store })).toBe(false);
            });

            test('it can not create metanode when workflow is not writable', () => {
                $store.getters['workflow/isWritable'] = false;
                $store.getters['selection/selectedNodes'] = [{ allowedActions: { canCollapse: 'true' } }];
                expect(workflowShortcuts.createMetanode.condition({ $store })).toBe(false);
            });

            test('it can not create metanode when no node is selected', () => {
                $store.getters['workflow/isWritable'] = false;
                expect(workflowShortcuts.createMetanode.condition({ $store })).toBe(false);
            });
        });


        describe('createComponent', () => {
            test('it can not create component when canCollapse is false', () => {
                $store.getters['workflow/isWritable'] = true;
                $store.getters['selection/selectedNodes'] = [{ allowedActions: { canCollapse: 'true' } }];
                expect(workflowShortcuts.createComponent.condition({ $store })).toBe(true);
                $store.getters['selection/selectedNodes'] = [{ allowedActions: { canCollapse: 'false' } }];
                expect(workflowShortcuts.createComponent.condition({ $store })).toBe(false);
            });

            test('it can not create component when workflow is not writable', () => {
                $store.getters['workflow/isWritable'] = false;
                $store.getters['selection/selectedNodes'] = [{ allowedActions: { canCollapse: 'true' } }];
                expect(workflowShortcuts.createComponent.condition({ $store })).toBe(false);
            });

            test('it can not create component when no node is selected', () => {
                $store.getters['workflow/isWritable'] = false;
                expect(workflowShortcuts.createComponent.condition({ $store })).toBe(false);
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
                expect(workflowShortcuts.expandMetanode.condition({ $store })).toBe(false);
                $store.getters['selection/singleSelectedNode'] = {
                    kind: 'metanode',
                    allowedActions: {
                        canExpand: 'true'
                    }
                };
                expect(workflowShortcuts.expandMetanode.condition({ $store })).toBe(true);
            });

            test('it can not expand metanode when workflow is not writable', () => {
                $store.getters['workflow/isWritable'] = false;
                $store.getters['selection/singleSelectedNode'] = {
                    kind: 'metanode',
                    allowedActions: {
                        canExpand: 'true'
                    }
                };
                expect(workflowShortcuts.expandMetanode.condition({ $store })).toBe(false);
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
                expect(workflowShortcuts.expandComponent.condition({ $store })).toBe(false);
                $store.getters['selection/singleSelectedNode'] = {
                    kind: 'component',
                    allowedActions: {
                        canExpand: 'true'
                    }
                };
                expect(workflowShortcuts.expandComponent.condition({ $store })).toBe(true);
            });

            test('it can not expand component when workflow is not writable', () => {
                $store.getters['workflow/isWritable'] = false;
                $store.getters['selection/singleSelectedNode'] = {
                    kind: 'component',
                    allowedActions: {
                        canExpand: 'true'
                    }
                };
                expect(workflowShortcuts.expandComponent.condition({ $store })).toBe(false);
            });
        });

        describe('openLayoutEditor', () => {
            test('it is not a component, button disabled', () => {
                expect(workflowShortcuts.openLayoutEditor.condition({ $store })).toBeFalsy();
            });

            test('it is not a writable component, button disabled', () => {
                $store.state.workflow.activeWorkflow.info.containerType = 'component';
                $store.getters['workflow/isWritable'] = false;
                expect(workflowShortcuts.openLayoutEditor.condition({ $store })).toBeFalsy();
            });

            test('it is a writable component, button enabled', () => {
                $store.state.workflow.activeWorkflow.info.containerType = 'component';
                $store.getters['workflow/isWritable'] = true;
                expect(workflowShortcuts.openLayoutEditor.condition({ $store })).toBe(true);
            });
        });

        test('copy', () => {
            expect(workflowShortcuts.copy.condition({ $store })).toBeFalsy();
            $store.getters['selection/selectedNodes'] = [{ allowedActions: {} }];
            expect(workflowShortcuts.copy.condition({ $store })).toBe(true);
            $store.state.application.hasClipboardSupport = false;
            expect(workflowShortcuts.copy.condition({ $store })).toBeFalsy();
        });

        describe('cut', () => {
            test('nothing selected, not writeable -> disabled', () => {
                expect(workflowShortcuts.cut.condition({ $store })).toBeFalsy();
            });

            test('nodes selected, not writeable -> disabled', () => {
                $store.getters['selection/selectedNodes'] = [{ allowedActions: {} }];
                expect(workflowShortcuts.cut.condition({ $store })).toBeFalsy();
            });

            test('nothing selected, writeable -> disabled', () => {
                $store.getters['workflow/isWritable'] = true;
                expect(workflowShortcuts.cut.condition({ $store })).toBeFalsy();
            });

            test('nodes selected, writeable -> enabled', () => {
                $store.getters['selection/selectedNodes'] = [{ allowedActions: {} }];
                $store.getters['workflow/isWritable'] = true;
                expect(workflowShortcuts.cut.condition({ $store })).toBe(true);
            });

            test('nodes selected, writeable but no clipboard permission -> disabled', () => {
                $store.state.application.hasClipboardSupport = false;
                $store.getters['selection/selectedNodes'] = [{ allowedActions: {} }];
                $store.getters['workflow/isWritable'] = true;
                expect(workflowShortcuts.cut.condition({ $store })).toBeFalsy();
            });
        });

        test('paste', () => {
            expect(workflowShortcuts.paste.condition({ $store })).toBeFalsy();
            $store.getters['workflow/isWritable'] = true;
            expect(workflowShortcuts.paste.condition({ $store })).toBe(true);
            $store.state.application.hasClipboardSupport = false;
            expect(workflowShortcuts.paste.condition({ $store })).toBeFalsy();
        });
    });
});
