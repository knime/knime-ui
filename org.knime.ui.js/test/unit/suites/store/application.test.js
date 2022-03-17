import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';
import Vuex from 'vuex';

describe('application store', () => {
    let store, storeConfig, fetchApplicationState, localVue, addEventListener, removeEventListener,
        commitSpy, dispatchSpy;

    const applicationState = {
        openedWorkflows: [{ projectId: 'foo', name: 'bar' }]
    };

    beforeAll(() => {
        fetchApplicationState = jest.fn().mockReturnValue(applicationState);
        addEventListener = jest.fn();
        removeEventListener = jest.fn();

        jest.doMock('~api', () => ({
            __esModule: true,
            addEventListener,
            removeEventListener,
            fetchApplicationState
        }), { virtual: true });

        localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(async () => {
        storeConfig = {
            application: await import('~/store/application'),
            workflow: {
                actions: {
                    loadWorkflow: jest.fn(),
                    unloadActiveWorkflow: jest.fn()
                }
            },
            canvas: {
                mutations: {
                    restoreState: jest.fn()
                },
                getters: {
                    toSave: () => ({
                        saveMe: 'canvas'
                    })
                }
            }
        };
        store = mockVuexStore(storeConfig);
        commitSpy = jest.spyOn(store, 'commit');
        dispatchSpy = jest.spyOn(store, 'dispatch');
    });

    it('creates an empty store', () => {
        expect(store.state.application).toStrictEqual({
            openProjects: [],
            activeProjectId: null,
            savedUserState: {}
        });
    });
    
    describe('mutations', () => {
        it('allows setting the active id', () => {
            store.commit('application/setActiveProjectId', 'foo');
            expect(store.state.application.activeProjectId).toBe('foo');
        });

        it('allows setting all items', () => {
            store.commit('application/setOpenProjects',
                [{ projectId: 'foo', name: 'bar' }, { projectId: 'bee', name: 'gee', activeWorkflow: {} }]);

            expect(store.state.application.openProjects).toStrictEqual(
                [{ projectId: 'foo', name: 'bar' },
                    { projectId: 'bee', name: 'gee', activeWorkflow: {} }]
            );
        });

        it('allows setting savedState', () => {
            store.commit('application/setOpenProjects', [{ projectId: 'p1' }]);
            store.commit('application/saveUserState', { projectId: 'p1', workflowId: 'root', stateToSave: 'SAFE' });

            let savedState = store.state.application.savedUserState;

            expect(savedState.p1.root).toBe('SAFE');
        });
    });

    describe('actions', () => {
        it('allows initialization', async () => {
            await store.dispatch('application/initializeApplication');
    
            expect(addEventListener).toHaveBeenCalled();
            expect(fetchApplicationState).toHaveBeenCalled();
            expect(dispatchSpy).toHaveBeenCalledWith('application/replaceApplicationState', applicationState);
        });
    
        it('allows destroy', () => {
            store.dispatch('application/destroyApplication');
    
            expect(removeEventListener).toHaveBeenCalled();
            expect(dispatchSpy).toHaveBeenCalledWith('workflow/unloadActiveWorkflow', { clearWorkflow: true });
        });

        it('replaces application state', async () => {
            await store.dispatch('application/replaceApplicationState', applicationState);

            expect(commitSpy).toHaveBeenCalledWith('application/setOpenProjects',
                [{ projectId: 'foo', name: 'bar' }], undefined);
            expect(dispatchSpy).toHaveBeenCalledWith('application/setActiveProject',
                [{ projectId: 'foo', name: 'bar' }]);
        });

        it('sets active project', async () => {
            store.commit('application/setOpenProjects',
                [{ projectId: 'foo', name: 'bar' }, { projectId: 'bee', name: 'gee', activeWorkflow: {} }]);
            await store.dispatch('application/setActiveProject');

            expect(dispatchSpy).toHaveBeenCalledWith('application/switchWorkflow',
                { workflowId: 'root', projectId: 'bee' });
        });

        it('sets active project to first workflow if there are no currently active workflows', async () => {
            store.commit('application/setOpenProjects',
                [{ projectId: 'foo', name: 'bar' }, { projectId: 'foo2', name: 'gee' }]);
            await store.dispatch('application/setActiveProject');

            expect(dispatchSpy).toHaveBeenCalledWith('application/switchWorkflow',
                { workflowId: 'root', projectId: 'foo' });
        });

        it('does not set active project if there are no open workflows', async () => {
            await store.dispatch('application/setActiveProject');

            expect(dispatchSpy).toHaveBeenCalledWith('application/switchWorkflow', null);
        });

        it('allows to switch the workflow', async () => {
            const openedProjects = {
                openedWorkflows:
                    [
                        { projectId: '0', name: 'p0' },
                        { projectId: '1', name: 'p1' },
                        { projectId: '2', name: 'p2' }
                    ]
            };
            await store.dispatch('application/replaceApplicationState', openedProjects);

            expect(store.state.application.activeProjectId).toBe('0');
            
            store.dispatch('application/switchWorkflow', { projectId: '2', name: 'p2' });
            expect(store.state.application.activeProjectId).toBe('2');
        });

        it('saves user state', async () => {
            await store.dispatch('application/replaceApplicationState',
                { openedWorkflows: [{ projectId: '1', name: 'p1' }] });
            expect(store.state.application.savedUserState).toStrictEqual({
                '1': {}
            });
            store.dispatch('application/saveUserState');

            expect(store.state.application.savedUserState).toStrictEqual({
                '1': {
                    undefined: {
                        canvas: { saveMe: 'canvas' }
                    }
                }
            });
        });

        it('restores ui state', async () => {
            await store.dispatch('application/replaceApplicationState',
                { openedWorkflows: [{ projectId: '1', name: 'p1' }] });
            expect(storeConfig.canvas.mutations.restoreState).toHaveBeenCalled();

            await store.dispatch('application/switchWorkflow', { projectId: '1', workflowId: 'root' });
            expect(storeConfig.canvas.mutations.restoreState).toHaveBeenCalled();
        });
    });
});
