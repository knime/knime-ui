import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';
import Vuex from 'vuex';
import consola from 'consola';

import * as openedProjectsStoreConfig from '~/store/openedProjects';

describe('Opened projects store', () => {
    let localVue, store, setActiveWorkflowSnapshot, loadWorkflow;

    beforeAll(() => {
        localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        setActiveWorkflowSnapshot = jest.fn();
        loadWorkflow = jest.fn();
        store = mockVuexStore({
            openedProjects: openedProjectsStoreConfig,
            workflow: {
                actions: {
                    setActiveWorkflowSnapshot,
                    loadWorkflow
                }
            }
        });
    });

    it('creates an empty store', () => {
        expect(store.state.openedProjects).toStrictEqual({
            items: [],
            activeId: null
        });
    });

    describe('mutations', () => {
        it('allows setting the active Id', () => {
            store.commit('openedProjects/setActiveId', 'foo');
            expect(store.state.openedProjects).toStrictEqual({
                items: [],
                activeId: 'foo'
            });
        });

        it('allows setting all items', () => {
            store.commit('openedProjects/setProjects', [{ projectId: 'foo', name: 'bar' }]);
            expect(store.state.openedProjects).toStrictEqual({
                items: [{ projectId: 'foo', name: 'bar' }],
                activeId: null
            });
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

            expect(store.state.openedProjects).toStrictEqual({
                items: [
                    { projectId: '0', name: 'p0' },
                    { projectId: '1', name: 'p1' },
                    { projectId: '2', name: 'p2' }
                ],
                activeId: '1'
            });

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

        it('allows switching the active project', () => {
            store.dispatch('openedProjects/setProjects', [
                { projectId: '0', name: 'p0' },
                { projectId: '1', name: 'p1', activeWorkflow: {} },
                { projectId: '2', name: 'p2' }
            ]);
            store.dispatch('openedProjects/switchProject', '2');
            expect(loadWorkflow).toHaveBeenCalledWith(expect.anything(), { projectId: '2' });
            expect(store.state.openedProjects.activeId).toBe('2');

        });
    });
});
