import executionCommands from '~/commands/executionCommands';

describe('executionCommands', () => {
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
                'selection/singleSelectedNode': null
            }
        };
    });

    describe('execute', () => {
        describe('all', () => {
            test('executeAll', () => {
                executionCommands.executeAll.execute({ $store });
                expect(mockDispatch).toHaveBeenCalledWith('workflow/executeNodes', 'all');
            });

            test('cancelAll', () => {
                executionCommands.cancelAll.execute({ $store });
                expect(mockDispatch).toHaveBeenCalledWith('workflow/cancelNodeExecution', 'all');
            });

            test('resetAll', () => {
                executionCommands.resetAll.execute({ $store });
                expect(mockDispatch).toHaveBeenCalledWith('workflow/resetNodes', 'all');
            });
        });

        describe('selection', () => {
            test('executeSelected', () => {
                executionCommands.executeSelected.execute({ $store });
                expect(mockDispatch).toHaveBeenCalledWith('workflow/executeNodes', 'selected');
            });

            test('cancelSelected', () => {
                executionCommands.cancelSelected.execute({ $store });
                expect(mockDispatch).toHaveBeenCalledWith('workflow/cancelNodeExecution', 'selected');
            });

            test('resetSelected', () => {
                executionCommands.resetSelected.execute({ $store });
                expect(mockDispatch).toHaveBeenCalledWith('workflow/resetNodes', 'selected');
            });
        });

        describe('single selection', () => {
            beforeEach(() => {
                $store.getters['selection/singleSelectedNode'] = { id: 'root:3' };
            });

            test('resumeLoopExecution', () => {
                executionCommands.resumeLoopExecution.execute({ $store });
                expect(mockDispatch).toHaveBeenCalledWith('workflow/resumeLoopExecution', 'root:3');
            });

            test('pauseLoopExecution', () => {
                executionCommands.pauseLoopExecution.execute({ $store });
                expect(mockDispatch).toHaveBeenCalledWith('workflow/pauseLoopExecution', 'root:3');
            });

            test('stepLoopExecution', () => {
                executionCommands.stepLoopExecution.execute({ $store });
                expect(mockDispatch).toHaveBeenCalledWith('workflow/stepLoopExecution', 'root:3');
            });
        });
    });

    describe('condition', () => {
        describe('all', () => {
            test('executeAll', () => {
                expect(executionCommands.executeAll.condition({ $store })).toBeFalsy();
                $store.state.workflow.activeWorkflow.allowedActions.canExecute = true;
                expect(executionCommands.executeAll.condition({ $store })).toBe(true);
            });

            test('cancelAll', () => {
                expect(executionCommands.cancelAll.condition({ $store })).toBeFalsy();
                $store.state.workflow.activeWorkflow.allowedActions.canCancel = true;
                expect(executionCommands.cancelAll.condition({ $store })).toBe(true);
            });

            test('resetAll', () => {
                expect(executionCommands.resetAll.condition({ $store })).toBeFalsy();
                $store.state.workflow.activeWorkflow.allowedActions.canReset = true;
                expect(executionCommands.resetAll.condition({ $store })).toBe(true);
            });
        });

        describe('selection', () => {
            test('executeSelected', () => {
                expect(executionCommands.executeSelected.condition({ $store })).toBeFalsy();
                $store.getters['selection/selectedNodes'] = [{
                    allowedActions: { canExecute: true }
                }];
                expect(executionCommands.executeSelected.condition({ $store })).toBe(true);
            });

            test('cancelSelected', () => {
                expect(executionCommands.cancelSelected.condition({ $store })).toBeFalsy();
                $store.getters['selection/selectedNodes'] = [{
                    allowedActions: { canCancel: true }
                }];
                expect(executionCommands.cancelSelected.condition({ $store })).toBe(true);
            });

            test('resetSelected', () => {
                expect(executionCommands.resetSelected.condition({ $store })).toBeFalsy();
                $store.getters['selection/selectedNodes'] = [{
                    allowedActions: { canReset: true }
                }];
                expect(executionCommands.resetSelected.condition({ $store })).toBe(true);
            });
        });

        describe('single selection', () => {
            test('resumeLoopExecution', () => {
                expect(executionCommands.resumeLoopExecution.condition({ $store })).toBeFalsy();
                $store.getters['selection/singleSelectedNode'] = {
                    loopInfo: {
                        allowedActions: {
                            canResume: true
                        }
                    }
                };
                expect(executionCommands.resumeLoopExecution.condition({ $store })).toBe(true);
            });

            test('pauseLoopExecution', () => {
                expect(executionCommands.pauseLoopExecution.condition({ $store })).toBeFalsy();
                $store.getters['selection/singleSelectedNode'] = {
                    loopInfo: {
                        allowedActions: {
                            canPause: true
                        }
                    }
                };
                expect(executionCommands.pauseLoopExecution.condition({ $store })).toBe(true);
            });


            test('stepLoopExecution', () => {
                expect(executionCommands.stepLoopExecution.condition({ $store })).toBeFalsy();
                $store.getters['selection/singleSelectedNode'] = {
                    loopInfo: {
                        allowedActions: {
                            canStep: true
                        }
                    }
                };
                expect(executionCommands.stepLoopExecution.condition({ $store })).toBe(true);
            });
        });
    });
});
