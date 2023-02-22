import applicationShortcuts from '../applicationShortcuts';

jest.mock('@api', () => ({
    __esModule: true,
    openWorkflow: jest.fn(),
    createWorkflow: jest.fn()
}));

describe('applicationShortcuts', () => {
    let mockDispatch, mockCommit, $store;

    beforeEach(() => {
        mockDispatch = jest.fn();
        mockCommit = jest.fn();
        $store = {
            dispatch: mockDispatch,
            commit: mockCommit,
            state: {
                workflow: {
                    activeWorkflow: {
                        projectId: '1'
                    }
                }
            }
        };
    });

    test('createWorkflow', () => {
        applicationShortcuts.createWorkflow.execute({ $store });
        expect(mockCommit).toHaveBeenCalledWith('spaces/setIsCreateWorkflowModalOpen', true);
    });

    test('closeWorkflow', () => {
        applicationShortcuts.closeWorkflow.execute({ $store });
        expect(mockDispatch).toHaveBeenCalledWith('workflow/closeWorkflow', '1');
    });

    describe('condition', () => {
        test('closeWorkflow', () => {
            expect(applicationShortcuts.closeWorkflow.condition({ $store })).toBe(true);
            $store.state.workflow.activeWorkflow.projectId = null;
            expect(applicationShortcuts.closeWorkflow.condition({ $store })).toBeFalsy();
        });
    });
});
