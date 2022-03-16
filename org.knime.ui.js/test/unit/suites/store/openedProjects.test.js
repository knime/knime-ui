import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';
import Vuex from 'vuex';
import * as openedProjectsStoreConfig from '~/store/application';

describe('Opened projects store', () => {
    let localVue, store, storeConfig, dispatchSpy, activeWorkflowIdMock;

    beforeAll(() => {
        localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        storeConfig = {
            openedProjects: openedProjectsStoreConfig,
            workflow: {
                actions: {
                    loadWorkflow: jest.fn(),
                    unloadActiveWorkflow: jest.fn()
                },
                getters: {
                    activeWorkflowId() {
                        return activeWorkflowIdMock;
                    }
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
        dispatchSpy = jest.spyOn(store, 'dispatch');
    });

    it('creates an empty store', () => {
        expect(store.state.openedProjects).toStrictEqual({
            openProjects: [],
            activeProjectId: null,
            savedState: {}
        });
    });

    describe('mutations', () => {
        it('allows setting the active Id', () => {
            store.commit('openedProjects/setActiveProjectId', 'foo');
            expect(store.state.openedProjects.activeProjectId).toBe('foo');
        });

        it('allows setting all items', () => {
            store.commit('openedProjects/setProjects', [{ projectId: 'foo', name: 'bar' }]);
            expect(store.state.openedProjects.openProjects).toStrictEqual([
                { projectId: 'foo', name: 'bar' }
            ]);
            expect(store.state.openedProjects.activeProjectId).toBe(null);
            expect(store.state.openedProjects.savedState).toStrictEqual({
                foo: {}
            });
        });

        it('allows setting savedState', () => {
            store.commit('openedProjects/setProjects', [{ projectId: 'p1' }]);
            store.commit('openedProjects/saveState', { projectId: 'p1', workflowId: 'root', savedState: 'SAFE' });

            let savedState = store.state.openedProjects.savedState;
            expect(savedState.p1.root).toBe('SAFE');
        });
    });

    describe('actions', () => {
        it('allows setting all items', () => {
            let activeWorkflow = { dummy: true };
            store.dispatch('openedProjects/setProjects', [
                { projectId: '0', name: 'p0' },
                { projectId: '1', name: 'p1', activeWorkflow },
                { projectId: '2', name: 'p2' }
            ]);

            expect(store.state.openedProjects.openProjects).toStrictEqual([
                { projectId: '0', name: 'p0' },
                { projectId: '1', name: 'p1' },
                { projectId: '2', name: 'p2' }
            ]);

            expect(dispatchSpy).toHaveBeenCalledWith('openedProjects/switchWorkflow', { projectId: '1', dummy: true });
        });

        it('unloads current workflow if there is no active workflow', () => {
            consola.info = jest.fn();
            store.dispatch('openedProjects/setProjects', [
                { projectId: '0', name: 'p0' },
                { projectId: '1', name: 'p1' },
                { projectId: '2', name: 'p2' }
            ]);

            expect(dispatchSpy).toHaveBeenCalledWith('openedProjects/switchWorkflow', null);
            expect(consola.info).toHaveBeenCalledWith('No active workflow provided');
        });

        describe('error handling', () => {
            let error;

            beforeEach(() => {
                error = consola.error;
                consola.error = jest.fn();
            });

            afterEach(() => {
                consola.error = error;
            });

            it('handles multiple activeWorkflows', () => {
                let activeWorkflow = { dummy: true };
                store.dispatch('openedProjects/setProjects', [
                    { projectId: '0', name: 'p0' },
                    { projectId: '1', name: 'p1', activeWorkflow },
                    { projectId: '2', name: 'p2', activeWorkflow }
                ]);

                expect(store.state.openedProjects.activeProjectId).toBe('1');
                expect(dispatchSpy).toHaveBeenCalledWith('openedProjects/switchWorkflow',
                    { projectId: '1', dummy: true });
                expect(consola.error).toHaveBeenCalledWith(
                    'More than one active workflow found. Not supported. Opening only first item.'
                );
            });
        });

        it('allows switching the active project', async () => {
            store.dispatch('openedProjects/setProjects', [
                { projectId: '0', name: 'p0' },
                { projectId: '1', name: 'p1', activeWorkflow: {} },
                { projectId: '2', name: 'p2', savedState: { canvas: { saveMe: 'canvas' } } }
            ]);
            expect(store.state.openedProjects.activeProjectId).toBe('1');
            
            await store.dispatch('openedProjects/switchWorkflow', { projectId: '2', name: 'p2' });
            expect(store.state.openedProjects.activeProjectId).toBe('2');
        });

        it('saves ui state', () => {
            store.dispatch('openedProjects/setProjects', [
                { projectId: '1', name: 'p1', activeWorkflow: { dummy: true } }
            ]);
            expect(store.state.openedProjects.savedState).toStrictEqual({
                '1': {}
            });
            store.dispatch('openedProjects/saveState');

            expect(store.state.openedProjects.savedState).toStrictEqual({
                '1': {
                    undefined: {
                        canvas: { saveMe: 'canvas' }
                    }
                }
            });
        });

        it('restores ui state', async () => {
            store.dispatch('openedProjects/setProjects', [
                { projectId: '1', name: 'p1', activeWorkflow: {} }
            ]);

            await store.dispatch('openedProjects/switchWorkflow', { projectId: '1', workflowId: 'root' });
            expect(storeConfig.canvas.mutations.restoreState).toHaveBeenCalledTimes(2);
        });

        it('resets ui state', async () => {
            store.dispatch('openedProjects/setProjects', [
                { projectId: '1', name: 'p1', activeWorkflow: {} },
                { projectId: '2', name: 'p2' }
            ]);

            await store.dispatch('openedProjects/switchWorkflow', { projectId: '2', workflowId: 'root' });
            expect(storeConfig.canvas.mutations.restoreState)
                .toHaveBeenCalledWith(expect.anything(), undefined);
        });
    });
});
