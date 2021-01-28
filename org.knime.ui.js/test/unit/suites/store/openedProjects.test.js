import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';
import Vuex from 'vuex';
import * as openedProjectsStoreConfig from '~/store/openedProjects';

describe('Opened projects store', () => {
    let localVue, store, setActiveWorkflowSnapshot, storeConfig;

    beforeAll(() => {
        localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        setActiveWorkflowSnapshot = jest.fn();
        storeConfig = {
            openedProjects: openedProjectsStoreConfig,
            workflow: {
                actions: {
                    setActiveWorkflowSnapshot,
                    loadWorkflow: jest.fn()
                },
                getters: {
                    activeWorkflowId: jest.fn().mockReturnValue('root')
                }
            },
            canvas: {
                mutations: {
                    restoreState: jest.fn()
                },
                getters: {
                    saveState: () => ({
                        saveMe: 'canvas'
                    })
                }
            }
        };
        store = mockVuexStore(storeConfig);
    });

    it('creates an empty store', () => {
        expect(store.state.openedProjects).toStrictEqual({
            items: [],
            activeId: null,
            savedState: {}
        });
    });

    describe('mutations', () => {
        it('allows setting the active Id', () => {
            store.commit('openedProjects/setActiveId', 'foo');
            expect(store.state.openedProjects.activeId).toBe('foo');
        });

        it('allows setting all items', () => {
            store.commit('openedProjects/setProjects', [{ projectId: 'foo', name: 'bar' }]);
            expect(store.state.openedProjects.items).toStrictEqual([
                { projectId: 'foo', name: 'bar' }
            ]);
            expect(store.state.openedProjects.activeId).toBe(null);
        });

        it('allows setting savedState', () => {
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

            expect(store.state.openedProjects.items).toStrictEqual([
                { projectId: '0', name: 'p0' },
                { projectId: '1', name: 'p1' },
                { projectId: '2', name: 'p2' }
            ]);
            expect(store.state.openedProjects.activeId).toBe('1');

            expect(setActiveWorkflowSnapshot).toHaveBeenCalledWith(expect.anything(), {
                ...activeWorkflow,
                projectId: '1'
            });
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

            it('handles missing activeWorkflow', () => {
                store.dispatch('openedProjects/setProjects', [
                    { projectId: '0', name: 'p0' }
                ]);
                expect(setActiveWorkflowSnapshot).not.toHaveBeenCalled();
                expect(consola.error).toHaveBeenCalledWith('No active workflow provided');
            });

            it('handles multiple activeWorkflows', () => {
                let activeWorkflow = { dummy: true };
                store.dispatch('openedProjects/setProjects', [
                    { projectId: '0', name: 'p0' },
                    { projectId: '1', name: 'p1', activeWorkflow },
                    { projectId: '2', name: 'p2', activeWorkflow }
                ]);
                expect(setActiveWorkflowSnapshot).toHaveBeenCalledTimes(1);
                expect(setActiveWorkflowSnapshot).toHaveBeenCalledWith(expect.anything(), {
                    ...activeWorkflow,
                    projectId: '1'
                });
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

            await store.dispatch('openedProjects/switchWorkflow', { projectId: '2', workflowId: 'root' });

            expect(storeConfig.workflow.actions.loadWorkflow)
                .toHaveBeenCalledWith(expect.anything(), { projectId: '2', workflowId: 'root' });
            expect(store.state.openedProjects.activeId).toBe('2');
        });

        it('saves ui state', async () => {
            store.dispatch('openedProjects/setProjects', [
                { projectId: '1', name: 'p1', activeWorkflow: {} }
            ]);
            expect(store.state.openedProjects.savedState).toStrictEqual({});

            await store.dispatch('openedProjects/switchWorkflow', '1');

            expect(store.state.openedProjects.savedState).toStrictEqual({
                '1': {
                    root: {
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
            expect(storeConfig.canvas.mutations.restoreState)
                .toHaveBeenCalledWith(expect.anything(), { saveMe: 'canvas' });
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
