import { openWorkflow as mockOpenWorkflow, createWorkflow as mockCreateWorkflow } from '@api';
import applicationShortcuts from '../applicationShortcuts';

jest.mock('@api', () => ({
    __esModule: true,
    openWorkflow: jest.fn(),
    createWorkflow: jest.fn()
}));

describe('applicationShortcuts', () => {
    let mockDispatch, $store, mockPush, $router;

    beforeEach(() => {
        mockDispatch = jest.fn();
        mockPush = jest.fn();
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
        $router = {
            push: mockPush
        };
    });

    test('openWorkflow', () => {
        applicationShortcuts.openWorkflow.execute({ $router });
        expect(mockOpenWorkflow).toHaveBeenCalledTimes(1);
        expect(mockPush).toHaveBeenCalledTimes(1);
    });

    test('createWorkflow', () => {
        applicationShortcuts.createWorkflow.execute();
        expect(mockCreateWorkflow).toHaveBeenCalledTimes(1);
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
