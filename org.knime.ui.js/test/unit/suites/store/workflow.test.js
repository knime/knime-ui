/* eslint-disable no-magic-numbers */
import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';
import * as $shapes from '~/style/shapes';
import Vuex from 'vuex';

describe('workflow store', () => {
    let store, localVue, templateMutationMock, nodeMutationMock, removeWorkflowMock, loadStore;

    beforeAll(() => {
        localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        templateMutationMock = jest.fn();
        nodeMutationMock = jest.fn();
        removeWorkflowMock = jest.fn();

        loadStore = async ({ apiMocks = {}, nodes = {} } = {}) => {
            /**
             * We have to import the workflow-store dynamically to apply our ~api mocks.
             * Because the module is cached after it is required for the first time,
             * a reset is needed
             */
            jest.resetModules();
            jest.doMock('~api', () => ({
                __esModule: true,
                ...apiMocks
            }), { virtual: true });

            store = mockVuexStore({
                workflow: await import('~/store/workflow'),
                nodeTemplates: {
                    mutations: {
                        add: templateMutationMock
                    }
                },
                nodes: {
                    mutations: {
                        add: nodeMutationMock,
                        removeWorkflow: removeWorkflowMock
                    },
                    state: nodes
                }
            });
        };
    });

    it('creates an empty store', async () => {
        await loadStore();
        expect(store.state.workflow.activeWorkflow).toBe(null);
        expect(store.state.workflow.activeSnapshotId).toBe(null);
        expect(store.state.workflow.tooltip).toBe(null);
    });

    describe('mutation', () => {
        beforeEach(async () => {
            await loadStore();
        });

        it('adds workflows', () => {
            store.commit('workflow/setActiveWorkflow', { projectId: 'foo' });

            expect(store.state.workflow.activeWorkflow).toStrictEqual({ projectId: 'foo', nodeIds: [] });
        });

        it('extracts templates', () => {
            store.commit('workflow/setActiveWorkflow', {
                projectId: 'bar',
                nodeTemplates: {
                    foo: { bla: 1 },
                    bar: { qux: 2 }
                }
            });

            expect(templateMutationMock).toHaveBeenCalledWith(expect.anything(), {
                templateData: { bla: 1 }, templateId: 'foo'
            });
            expect(templateMutationMock).toHaveBeenCalledWith(expect.anything(), {
                templateData: { qux: 2 }, templateId: 'bar'
            });
            expect(store.state.workflow.activeWorkflow).toStrictEqual({ projectId: 'bar', nodeIds: [] });
        });

        it('extracts nodes', () => {
            store.commit('workflow/setActiveWorkflow', {
                projectId: 'quux',
                nodes: {
                    foo: { bla: 1 },
                    bar: { qux: 2 }
                }
            });

            expect(nodeMutationMock).toHaveBeenCalledWith(expect.anything(), {
                nodeData: { bla: 1 }, workflowId: 'quux'
            });
            expect(nodeMutationMock).toHaveBeenCalledWith(expect.anything(), {
                nodeData: { qux: 2 }, workflowId: 'quux'
            });
            expect(store.state.workflow.activeWorkflow).toStrictEqual(
                { projectId: 'quux', nodeIds: ['foo', 'bar'] }
            );
        });

        it('removes existing nodes from node store', () => {
            store.commit('workflow/setActiveWorkflow', {
                projectId: 'quux',
                nodes: {}
            });

            expect(removeWorkflowMock).toHaveBeenCalledWith(expect.anything(), 'quux');
        });

        it('allows setting the snapshot ID', () => {
            store.commit('workflow/setActiveSnapshotId', 'myId');
            expect(store.state.workflow.activeSnapshotId).toBe('myId');
        });

        it('allows setting the tooltip', () => {
            store.commit('workflow/setTooltip', { dummy: true });
            expect(store.state.workflow.tooltip).toStrictEqual({ dummy: true });
        });

    });

    describe('action', () => {
        it('loads root workflow successfully', async () => {
            let loadWorkflow = jest.fn().mockResolvedValue({ workflow: { dummy: true } });
            await loadStore({
                apiMocks: {
                    loadWorkflow
                }
            });
            const commit = jest.spyOn(store, 'commit');

            await store.dispatch('workflow/loadWorkflow', { projectId: 'wf1' });

            expect(loadWorkflow).toHaveBeenCalledWith('wf1', 'root');
            expect(commit).toHaveBeenNthCalledWith(1, 'workflow/setActiveWorkflow', {
                dummy: true,
                projectId: 'wf1'
            }, undefined);
        });

        it('loads inner workflow successfully', async () => {
            let loadWorkflow = jest.fn().mockResolvedValue({ workflow: { dummy: true } });
            await loadStore({
                apiMocks: {
                    loadWorkflow
                }
            });
            const commit = jest.spyOn(store, 'commit');

            await store.dispatch('workflow/loadWorkflow', { projectId: 'wf2', containerId: 'root:0:123' });

            expect(loadWorkflow).toHaveBeenCalledWith('wf2', 'root:0:123');
            expect(commit).toHaveBeenNthCalledWith(1, 'workflow/setActiveWorkflow', {
                dummy: true,
                projectId: 'wf2'
            }, undefined);
        });

    });

    describe('svg sizes', () => {
        const { canvasPadding, nodeSize, nodeStatusMarginTop, nodeStatusHeight, nodeNameMargin,
            nodeNameLineHeight } = $shapes;

        it('calculates dimensions of empty workflow', async () => {
            await loadStore();
            store.commit('workflow/setActiveWorkflow', {
                projectId: 'foo',
                nodeIds: [],
                workflowAnnotations: []
            });

            expect(store.getters['workflow/workflowBounds']).toStrictEqual({
                left: 0,
                right: 0,
                top: 0,
                bottom: 0
            });

            expect(store.getters['workflow/svgBounds']).toStrictEqual({
                x: 0,
                y: 0,
                width: canvasPadding,
                height: canvasPadding
            });
        });

        it('calculates dimensions of workflow containing one node away from the top left corner', async () => {
            await loadStore({
                nodes: {
                    foo: {
                        'root:0': {
                            position: { x: 200, y: 200 }
                        }
                    }
                }
            });
            store.commit('workflow/setActiveWorkflow', {
                projectId: 'foo',
                nodes: { 'root:0': null },
                workflowAnnotations: []
            });

            expect(store.getters['workflow/workflowBounds']).toStrictEqual({
                left: 200,
                right: 200 + nodeSize,
                top: 200 - nodeNameMargin - nodeNameLineHeight,
                bottom: 200 + nodeSize + nodeStatusMarginTop + nodeStatusHeight
            });


            expect(store.getters['workflow/svgBounds']).toStrictEqual({
                x: 0,
                y: 0,
                width: 296,
                height: 316
            });
        });

        it('calculates dimensions of workflow containing annotations only', async () => {
            await loadStore();
            store.commit('workflow/setActiveWorkflow', {
                projectId: 'foo',
                nodes: {},
                workflowAnnotations: [{
                    id: 'root:1',
                    bounds: {
                        x: -10,
                        y: -10,
                        width: 20,
                        height: 20
                    }
                }]
            });


            expect(store.getters['workflow/workflowBounds']).toStrictEqual({
                left: -10,
                right: 10,
                top: -10,
                bottom: 10
            });


            expect(store.getters['workflow/svgBounds']).toStrictEqual({
                x: -10,
                y: -10,
                width: canvasPadding + 20,
                height: canvasPadding + 20
            });
        });

        it('calculates dimensions of workflow containing overlapping node + annotation', async () => {
            await loadStore({
                nodes: {
                    foo: {
                        'root:0': { position: { x: 10, y: 10 } }
                    }
                }
            });
            store.commit('workflow/setActiveWorkflow', {
                projectId: 'foo',
                nodes: { 'root:0': null },
                workflowAnnotations: [{
                    id: 'root:1',
                    bounds: {
                        x: 26,
                        y: 26,
                        width: 26,
                        height: 26
                    }
                }]
            });

            expect(store.getters['workflow/workflowBounds']).toStrictEqual({
                left: 10,
                right: 52,
                top: -16,
                bottom: 62
            });

            expect(store.getters['workflow/svgBounds']).toStrictEqual({
                x: 0,
                y: -16,
                width: canvasPadding + 52,
                height: canvasPadding + 78
            });
        });
    });
});
