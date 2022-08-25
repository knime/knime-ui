import executionShortcuts from '@/shortcuts/executionShortcuts';

describe('executionShortcuts', () => {
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
                executionShortcuts.executeAll.execute({ $store });
                expect(mockDispatch).toHaveBeenCalledWith('workflow/executeNodes', 'all');
            });

            test('cancelAll', () => {
                executionShortcuts.cancelAll.execute({ $store });
                expect(mockDispatch).toHaveBeenCalledWith('workflow/cancelNodeExecution', 'all');
            });

            test('resetAll', () => {
                executionShortcuts.resetAll.execute({ $store });
                expect(mockDispatch).toHaveBeenCalledWith('workflow/resetNodes', 'all');
            });
        });

        describe('selection', () => {
            test('executeSelected', () => {
                executionShortcuts.executeSelected.execute({ $store });
                expect(mockDispatch).toHaveBeenCalledWith('workflow/executeNodes', 'selected');
            });

            test('cancelSelected', () => {
                executionShortcuts.cancelSelected.execute({ $store });
                expect(mockDispatch).toHaveBeenCalledWith('workflow/cancelNodeExecution', 'selected');
            });

            test('resetSelected', () => {
                executionShortcuts.resetSelected.execute({ $store });
                expect(mockDispatch).toHaveBeenCalledWith('workflow/resetNodes', 'selected');
            });
        });

        describe('single selection', () => {
            beforeEach(() => {
                $store.getters['selection/singleSelectedNode'] = { id: 'root:3' };
            });

            test('resumeLoopExecution', () => {
                executionShortcuts.resumeLoopExecution.execute({ $store });
                expect(mockDispatch).toHaveBeenCalledWith('workflow/resumeLoopExecution', 'root:3');
            });

            test('pauseLoopExecution', () => {
                executionShortcuts.pauseLoopExecution.execute({ $store });
                expect(mockDispatch).toHaveBeenCalledWith('workflow/pauseLoopExecution', 'root:3');
            });

            test('stepLoopExecution', () => {
                executionShortcuts.stepLoopExecution.execute({ $store });
                expect(mockDispatch).toHaveBeenCalledWith('workflow/stepLoopExecution', 'root:3');
            });
        });
    });

    describe('condition', () => {
        describe('all', () => {
            test('executeAll', () => {
                expect(executionShortcuts.executeAll.condition({ $store })).toBeFalsy();
                $store.state.workflow.activeWorkflow.allowedActions.canExecute = true;
                expect(executionShortcuts.executeAll.condition({ $store })).toBe(true);
            });

            test('cancelAll', () => {
                expect(executionShortcuts.cancelAll.condition({ $store })).toBeFalsy();
                $store.state.workflow.activeWorkflow.allowedActions.canCancel = true;
                expect(executionShortcuts.cancelAll.condition({ $store })).toBe(true);
            });

            test('resetAll', () => {
                expect(executionShortcuts.resetAll.condition({ $store })).toBeFalsy();
                $store.state.workflow.activeWorkflow.allowedActions.canReset = true;
                expect(executionShortcuts.resetAll.condition({ $store })).toBe(true);
            });
        });

        describe('selection', () => {
            test('executeSelected', () => {
                expect(executionShortcuts.executeSelected.condition({ $store })).toBeFalsy();
                $store.getters['selection/selectedNodes'] = [{
                    allowedActions: { canExecute: true }
                }];
                expect(executionShortcuts.executeSelected.condition({ $store })).toBe(true);
            });

            test('cancelSelected', () => {
                expect(executionShortcuts.cancelSelected.condition({ $store })).toBeFalsy();
                $store.getters['selection/selectedNodes'] = [{
                    allowedActions: { canCancel: true }
                }];
                expect(executionShortcuts.cancelSelected.condition({ $store })).toBe(true);
            });

            test('resetSelected', () => {
                expect(executionShortcuts.resetSelected.condition({ $store })).toBeFalsy();
                $store.getters['selection/selectedNodes'] = [{
                    allowedActions: { canReset: true }
                }];
                expect(executionShortcuts.resetSelected.condition({ $store })).toBe(true);
            });
        });

        describe('single selection', () => {
            test('resumeLoopExecution', () => {
                expect(executionShortcuts.resumeLoopExecution.condition({ $store })).toBeFalsy();
                $store.getters['selection/singleSelectedNode'] = {
                    loopInfo: {
                        allowedActions: {
                            canResume: true
                        }
                    }
                };
                expect(executionShortcuts.resumeLoopExecution.condition({ $store })).toBe(true);
            });

            test('pauseLoopExecution', () => {
                expect(executionShortcuts.pauseLoopExecution.condition({ $store })).toBeFalsy();
                $store.getters['selection/singleSelectedNode'] = {
                    loopInfo: {
                        allowedActions: {
                            canPause: true
                        }
                    }
                };
                expect(executionShortcuts.pauseLoopExecution.condition({ $store })).toBe(true);
            });


            test('stepLoopExecution', () => {
                expect(executionShortcuts.stepLoopExecution.condition({ $store })).toBeFalsy();
                $store.getters['selection/singleSelectedNode'] = {
                    loopInfo: {
                        allowedActions: {
                            canStep: true
                        }
                    }
                };
                expect(executionShortcuts.stepLoopExecution.condition({ $store })).toBe(true);
            });
        });
    });
});
