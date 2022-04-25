jest.mock('~api', () => ({
    __esModule: true,
    openWorkflow: jest.fn(),
    createWorkflow: jest.fn()
}));

import applicationCommands from '~/commands/applicationCommands';
import { openWorkflow as mockOpenWorkflow, createWorkflow as mockCreateWorkflow } from '~api';

describe('applicationCommands', () => {
    test('openWorkflow', () => {
        applicationCommands.openWorkflow.execute();
        expect(mockOpenWorkflow).toHaveBeenCalledTimes(1);
    });

    test('createWorkflow', () => {
        applicationCommands.createWorkflow.execute();
        expect(mockCreateWorkflow).toHaveBeenCalledTimes(1);
    });

    test('closeWorkflow', () => {
        let mockDispatch = jest.fn();
        applicationCommands.closeWorkflow.execute({ $store: { dispatch: mockDispatch } });
        expect(mockDispatch).toHaveBeenCalledWith('workflow/closeWorkflow');
    });
});
