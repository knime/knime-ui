jest.mock('~api', () => ({
    __esModule: true,
    openWorkflow: jest.fn(),
    createWorkflow: jest.fn()
}));

import applicationShortcuts from '@/shortcuts/applicationShortcuts';
import { openWorkflow as mockOpenWorkflow, createWorkflow as mockCreateWorkflow } from '~api';

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
