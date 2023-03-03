/* eslint-disable max-lines */
import { expect, describe, it, vi, afterEach } from 'vitest';
import { changeLoopState, changeNodeState } from '@api';
import { mockVuexStore } from '@/test/test-utils';

vi.mock('@api');

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

            expect(changeNodeState).toHaveBeenCalledWith({
                nodeIds: ['x', 'y'], projectId: 'foo', action, workflowId: 'root'
            });
        });

        it.each([
            ['pauseLoopExecution', 'pause'],
            ['resumeLoopExecution', 'resume'],
            ['stepLoopExecution', 'step']
        ])('passes %s to API', async (fn, action) => {
            const { store } = await loadStore();
            store.commit('workflow/setActiveWorkflow', { projectId: 'foo', info: { containerId: 'root' } });

            store.dispatch(`workflow/${fn}`, 'node x');

            expect(changeLoopState).toHaveBeenCalledWith({
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
            expect(changeNodeState).toHaveBeenLastCalledWith({ projectId: 'foo', workflowId: 'root' });

            store.dispatch('selection/selectAllNodes');
            store.dispatch(`workflow/changeNodeState`, { nodes: 'selected' });
            expect(changeNodeState).toHaveBeenLastCalledWith({
                nodeIds: ['root:1', 'root:2'], projectId: 'foo', workflowId: 'root'
            });

            store.dispatch(`workflow/changeNodeState`, { nodes: ['root:2'] });
            expect(changeNodeState).toHaveBeenLastCalledWith({
                nodeIds: ['root:2'],
                projectId: 'foo',
                workflowId: 'root'
            });
        });
    });
});
