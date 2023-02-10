/* eslint-disable new-cap */
import { registeredHandlers } from '@api/json-rpc-notifications';
import { notifyPatch } from '@/util/event-syncer';
import { APP_ROUTES } from '@/router';

import eventsPlugin from '../events';

jest.mock('@/util/event-syncer');

jest.mock('@api/json-rpc-notifications', () => {
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
    const loadPlugin = () => {
        const storeMock = {
            state: {
                application: {}
            },
            dispatch: jest.fn(),
            commit: jest.fn()
        };

        const routerMock = {
            push: jest.fn()
        };

        eventsPlugin({ store: storeMock, router: routerMock });

        return { storeMock, routerMock };
    };

    test('Fixed Events', () => {
        loadPlugin();
        expect(Object.keys(registeredHandlers)).toStrictEqual([
            'WorkflowChangedEvent',
            'AppStateChangedEvent',
            'UpdateAvailableEvent',
            'SaveAndCloseWorkflowsEvent',
            'ImportURIEvent'
        ]);
    });

    test('All eventsHandlers are functions', () => {
        loadPlugin();
        Object.values(registeredHandlers).forEach(handler => {
            expect(typeof handler === 'function').toBe(true);
        });
    });

    describe('events', () => {
        afterEach(() => {
            notifyPatch.mockClear();
        });
        
        it('handles WorkflowChangedEvents', () => {
            const { storeMock } = loadPlugin();
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
            loadPlugin();
            expect(notifyPatch).toHaveBeenCalledWith(snapshotId);
        });

        it('should not call `notifyPatch` for patches without snapshotId', () => {
            loadPlugin();
            registeredHandlers.WorkflowChangedEvent(
                { patch: { ops: [{ dummy: true, path: '/foo/bar' }] } }
            );
            expect(notifyPatch).not.toHaveBeenCalled();
        });

        describe('AppState event', () => {
            it('navigates to entry page when no projects are open', async () => {
                const { storeMock, routerMock } = loadPlugin();
    
                await registeredHandlers.AppStateChangedEvent(
                    { appState: { openProjects: [] } }
                );

                expect(routerMock.push).toHaveBeenCalledWith({
                    name: APP_ROUTES.EntryPage.GetStartedPage
                });

                expect(storeMock.dispatch).toHaveBeenCalledWith(
                    'application/replaceApplicationState',
                    { openProjects: [] }
                );
            });
            
            it('navigates to the corresponding project when it is set as active', async () => {
                const { storeMock, routerMock } = loadPlugin();

                storeMock.state.application.activeProjectId = 'project1';
    
                const openProjects = [
                    { projectId: 'project1' },
                    { projectId: 'project2', activeWorkflowId: 'root' }
                ];

                await registeredHandlers.AppStateChangedEvent({
                    appState: { openProjects }
                });

                expect(routerMock.push).toHaveBeenCalledWith({
                    name: APP_ROUTES.WorkflowPage,
                    params: { projectId: 'project2', workflowId: 'root', skipGuards: true }
                });

                expect(storeMock.dispatch).toHaveBeenCalledWith(
                    'application/replaceApplicationState',
                    { openProjects }
                );
            });

            it('replaces application state', async () => {
                const { storeMock } = loadPlugin();
    
                await registeredHandlers.AppStateChangedEvent(
                    { appState: { openProjects: [{ id: 'mock' }] } }
                );
    
                expect(storeMock.dispatch).toHaveBeenCalledWith(
                    'application/replaceApplicationState',
                    { openProjects: [{ id: 'mock' }] }
                );
            });

            // TODO NXT-1437
            it.todo('should clear the application busy state');
        });
        
        // TODO NXT-1437
        describe('SaveAndCloseWorkflowsEvent', () => {
            it.todo('should set the application busy state');

            it.todo('should generate all unsaved project snapshots');

            it.todo('should call the browser function with the correct parameters');
        });

        describe('UpdateAvailable event', () => {
            it('replaces availableUpdates state', async () => {
                const { storeMock } = loadPlugin();
                const newReleases = [
                    {
                        isUpdatePossible: true,
                        name: 'KNIME Analytics Platform 5.0',
                        shortName: '5.0'
                    },
                    {
                        isUpdatePossible: false,
                        name: 'KNIME Analytics Platform 6.0',
                        shortName: '6.0'
                    }
                ];
                const bugfixes = [
                    'Update1',
                    'Update2'
                ];
    
                await registeredHandlers.UpdateAvailableEvent(
                    { newReleases, bugfixes }
                );
    
                expect(storeMock.commit).toHaveBeenCalledWith(
                    'application/setAvailableUpdates',
                    { newReleases, bugfixes }
                );
            });

            it('does not replace availableUpdates state if there are no updates', async () => {
                const { storeMock } = loadPlugin();
                const newReleases = undefined;
                const bugfixes = undefined;
    
                await registeredHandlers.UpdateAvailableEvent(
                    { newReleases, bugfixes }
                );
    
                expect(storeMock.commit).not.toHaveBeenCalled();
            });
        });
    });
});
