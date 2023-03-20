/* eslint-disable max-lines */
import { expect, describe, it, vi, afterEach } from 'vitest';
import { API } from '@api';
import { deepMocked, mockVuexStore } from '@/test/utils';

const mockedAPI = deepMocked(API);

describe('workflow store: Execution', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    const loadStore = async () => {
        const store = mockVuexStore({
            workflow: await import('@/store/workflow'),
            selection: await import('@/store/selection')
        });

        return { store };
    };

    describe('actions', () => {
        it.each([
            ['executeNodes', 'execute'],
            ['cancelNodeExecution', 'cancel'],
            ['resetNodes', 'reset']
        ])('passes %s to API', async (fn, action) => {
            const { store } = await loadStore();
            store.commit('workflow/setActiveWorkflow', { projectId: 'foo', info: { containerId: 'root' } });
            store.dispatch(`workflow/${fn}`, ['x', 'y']);

            expect(mockedAPI.node.changeNodeStates).toHaveBeenCalledWith(expect.objectContaining({
                nodeIds: ['x', 'y'],
                projectId: 'foo',
                action,
                workflowId: 'root'
            }));
        });

        it.each([
            ['pauseLoopExecution', 'pause'],
            ['resumeLoopExecution', 'resume'],
            ['stepLoopExecution', 'step']
        ])('passes %s to API', async (fn, action) => {
            const { store } = await loadStore();
            store.commit('workflow/setActiveWorkflow', { projectId: 'foo', info: { containerId: 'root' } });

            store.dispatch(`workflow/${fn}`, 'node x');

            expect(mockedAPI.node.changeLoopState).toHaveBeenCalledWith({
                nodeId: 'node x',
                projectId: 'foo',
                action,
                workflowId: 'root'
            });
        });

        it('overloaded changeNodeState', async () => {
            const { store } = await loadStore();
            store.commit('workflow/setActiveWorkflow', {
                projectId: 'foo',
                info: { containerId: 'root' },
                nodes: {
                    'root:1': { id: 'root:1' },
                    'root:2': { id: 'root:2' }
                }
            });

            store.dispatch(`workflow/changeNodeState`, { nodes: 'all' });
            expect(mockedAPI.node.changeNodeStates).toHaveBeenLastCalledWith(expect.objectContaining({
                projectId: 'foo',
                workflowId: 'root',
                nodeIds: []
            }));

            store.dispatch('selection/selectAllNodes');
            store.dispatch(`workflow/changeNodeState`, { nodes: 'selected' });
            expect(mockedAPI.node.changeNodeStates).toHaveBeenLastCalledWith(expect.objectContaining({
                nodeIds: ['root:1', 'root:2'],
                projectId: 'foo',
                workflowId: 'root'
            }));

            store.dispatch(`workflow/changeNodeState`, { action: 'action', nodes: ['root:2'] });
            expect(mockedAPI.node.changeNodeStates).toHaveBeenLastCalledWith({
                nodeIds: ['root:2'],
                projectId: 'foo',
                workflowId: 'root',
                action: 'action'
            });
        });
    });
});
