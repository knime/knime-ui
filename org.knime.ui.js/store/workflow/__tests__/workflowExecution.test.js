/* eslint-disable no-magic-numbers */
/* eslint-disable max-lines */
import Vuex from 'vuex';
import { createLocalVue } from '@vue/test-utils';

import { mockVuexStore } from '@/test/test-utils';

describe('workflow store: Execution', () => {
    let store, localVue, loadStore;

    beforeAll(() => {
        localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        store = null;

        loadStore = async ({ apiMocks = {} } = {}) => {
            /**
             * We have to import the workflow-store dynamically to apply our @api mocks.
             * Because the module is cached after it is required for the first time,
             * a reset is needed
             */
            jest.resetModules();
            jest.doMock('@api', () => ({
                __esModule: true,
                ...apiMocks
            }), { virtual: true });

            store = mockVuexStore({
                workflow: await import('@/store/workflow'),
                selection: await import('@/store/selection')
            });
        };
    });

    describe('actions', () => {
        it.each([
            ['executeNodes', 'execute'],
            ['cancelNodeExecution', 'cancel'],
            ['resetNodes', 'reset']
        ])('passes %s to API', async (fn, action) => {
            let mock = jest.fn();
            let apiMocks = { changeNodeState: mock };
            await loadStore({ apiMocks });
            store.commit('workflow/setActiveWorkflow', { projectId: 'foo', info: { containerId: 'root' } });
            store.dispatch(`workflow/${fn}`, ['x', 'y']);

            expect(mock).toHaveBeenCalledWith({
                nodeIds: ['x', 'y'], projectId: 'foo', action, workflowId: 'root'
            });
        });

        it.each([
            ['pauseLoopExecution', 'pause'],
            ['resumeLoopExecution', 'resume'],
            ['stepLoopExecution', 'step']
        ])('passes %s to API', async (fn, action) => {
            let mock = jest.fn();
            let apiMocks = { changeLoopState: mock };
            await loadStore({ apiMocks });
            store.commit('workflow/setActiveWorkflow', { projectId: 'foo', info: { containerId: 'root' } });

            store.dispatch(`workflow/${fn}`, 'node x');

            expect(mock).toHaveBeenCalledWith({ nodeId: 'node x', projectId: 'foo', action, workflowId: 'root' });
        });

        test('overloaded changeNodeState', async () => {
            let mock = jest.fn();
            let apiMocks = { changeNodeState: mock };
            await loadStore({ apiMocks });
            store.commit('workflow/setActiveWorkflow', {
                projectId: 'foo',
                info: { containerId: 'root' },
                nodes: {
                    'root:1': { id: 'root:1' },
                    'root:2': { id: 'root:2' }
                }
            });

            store.dispatch(`workflow/changeNodeState`, { nodes: 'all' });
            expect(mock).toHaveBeenLastCalledWith({ projectId: 'foo', workflowId: 'root' });

            store.dispatch('selection/selectAllNodes');
            store.dispatch(`workflow/changeNodeState`, { nodes: 'selected' });
            expect(mock).toHaveBeenLastCalledWith({
                nodeIds: ['root:1', 'root:2'], projectId: 'foo', workflowId: 'root'
            });

            store.dispatch(`workflow/changeNodeState`, { nodes: ['root:2'] });
            expect(mock).toHaveBeenLastCalledWith({ nodeIds: ['root:2'], projectId: 'foo', workflowId: 'root' });
        });
    });
});
