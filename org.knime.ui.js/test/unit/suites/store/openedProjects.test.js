import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';
import Vuex from 'vuex';

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

            expect(setActiveWorkflowSnapshot).toHaveBeenCalledWith(activeWorkflow);
        });

        it('allows switching the active project', () => {
            store.dispatch('openedProjects/setProjects', [
                { projectId: '0', name: 'p0' },
                { projectId: '1', name: 'p1', activeWorkflow: {} },
                { projectId: '2', name: 'p2' }
            ]);
            store.dispatch('openedProjects/switchProject', '2');
            expect(loadWorkflow).toHaveBeenCalledWith(expect.anything(), '2');
            expect(store.state.openedProjects.activeId).toBe('2');

        });
    });

});
