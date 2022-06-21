/* eslint-disable new-cap */
import eventsPlugin from '~knime-ui/plugins/events';

jest.mock('~knime-ui/api/json-rpc-notifications', () => {
    let registeredHandlers = {};
    const registerEventHandlers = (handlers) => {
        Object.entries(handlers).forEach(([key, value]) => {
            registeredHandlers[key] = value;
        });
    };

    return {
        registerEventHandlers,
        registeredHandlers
    };
});
import { registeredHandlers } from '~knime-ui/api/json-rpc-notifications';

describe('Event Plugin', () => {
    let storeMock;

    beforeEach(() => {
        storeMock = {
            dispatch: jest.fn()
        };
        eventsPlugin({ store: storeMock });
    });

    test('Fixed Events', () => {
        expect(Object.keys(registeredHandlers)).toStrictEqual([
            'WorkflowChangedEvent',
            'AppStateChangedEvent'
        ]);
    });

    test('All eventsHandlers are functions', () => {
        Object.values(registeredHandlers).forEach(handler => {
            expect(typeof handler === 'function').toBe(true);
        });
    });

    describe('events', () => {
        it('handles WorkflowChangedEvents', () => {
            registeredHandlers.WorkflowChangedEvent(
                { patch: { ops: [{ dummy: true, path: '/foo/bar' }] } }
            );

            expect(storeMock.dispatch).toHaveBeenCalledWith(
                'workflow/patch.apply',
                [{ dummy: true, path: '/activeWorkflow/foo/bar' }]
            );
        });

        it('handles AppStateChangedEvents', () => {
            registeredHandlers.AppStateChangedEvent(
                { appState: { openedWorkflows: { id: 1 } } }
            );

            expect(storeMock.dispatch).toHaveBeenCalledWith(
                'application/replaceApplicationState',
                {
                    openedWorkflows: { id: 1 }
                }
            );
        });
    });
});
