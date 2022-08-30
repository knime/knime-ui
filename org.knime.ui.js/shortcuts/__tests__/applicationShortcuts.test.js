import { openWorkflow as mockOpenWorkflow, createWorkflow as mockCreateWorkflow } from '@api';
import applicationShortcuts from '../applicationShortcuts';

jest.mock('@api', () => ({
    __esModule: true,
    openWorkflow: jest.fn(),
    createWorkflow: jest.fn()
}));

describe('applicationShortcuts', () => {
    test('openWorkflow', () => {
        applicationShortcuts.openWorkflow.execute();
        expect(mockOpenWorkflow).toHaveBeenCalledTimes(1);
    });

    test('createWorkflow', () => {
        applicationShortcuts.createWorkflow.execute();
        expect(mockCreateWorkflow).toHaveBeenCalledTimes(1);
    });

    test('closeWorkflow', () => {
        let mockDispatch = jest.fn();
        applicationShortcuts.closeWorkflow.execute({ $store: { dispatch: mockDispatch } });
        expect(mockDispatch).toHaveBeenCalledWith('workflow/closeWorkflow');
    });
});
