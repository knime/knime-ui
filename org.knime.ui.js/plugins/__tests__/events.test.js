/* eslint-disable new-cap */
import { registeredHandlers } from '@/api/json-rpc-notifications';
import { notifyPatch } from '@/util/event-syncer';

import eventsPlugin from '../events';

jest.mock('@/util/event-syncer');

jest.mock('@/api/json-rpc-notifications', () => {
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
        afterEach(() => {
            notifyPatch.mockClear();
        });
        
        it('handles WorkflowChangedEvents', () => {
            registeredHandlers.WorkflowChangedEvent(
                { patch: { ops: [{ dummy: true, path: '/foo/bar' }] } }
            );

            expect(storeMock.dispatch).toHaveBeenCalledWith(
                'workflow/patch.apply',
                [{ dummy: true, path: '/activeWorkflow/foo/bar' }]
            );
        });

        it('should call `notifyPatch` for patches with snapshotId', () => {
            const snapshotId = 1;
            registeredHandlers.WorkflowChangedEvent(
                { patch: { ops: [{ dummy: true, path: '/foo/bar' }] }, snapshotId }
            );

            expect(notifyPatch).toHaveBeenCalledWith(snapshotId);
        });

        it('should not call `notifyPatch` for patches without snapshotId', () => {
            registeredHandlers.WorkflowChangedEvent(
                { patch: { ops: [{ dummy: true, path: '/foo/bar' }] } }
            );

            expect(notifyPatch).not.toHaveBeenCalled();
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
