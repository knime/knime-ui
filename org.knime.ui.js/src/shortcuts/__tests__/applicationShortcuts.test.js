import applicationShortcuts from '../applicationShortcuts';

jest.mock('@api', () => ({
    __esModule: true,
    openWorkflow: jest.fn(),
    createWorkflow: jest.fn()
}));

describe('applicationShortcuts', () => {
    let mockDispatch, $store;

    beforeEach(() => {
        mockDispatch = jest.fn();
        $store = {
            dispatch: mockDispatch,
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
        expect(mockDispatch).toHaveBeenCalledWith('spaces/createWorkflow');
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
