/* eslint-disable no-magic-numbers */
import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';
import * as $shapes from '~/style/shapes';
import Vuex from 'vuex';
import Vue from 'vue';

describe('workflow store', () => {
    let store, localVue, loadStore, addEventListenerMock,
        removeEventListenerMock, moveObjectsMock;
    

    beforeAll(() => {
        localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        addEventListenerMock = jest.fn();
        removeEventListenerMock = jest.fn();
        store = null;
        moveObjectsMock = jest.fn().mockReturnValue(Promise.resolve());

        loadStore = async ({ apiMocks = {} } = {}) => {
            /**
             * We have to import the workflow-store dynamically to apply our ~api mocks.
             * Because the module is cached after it is required for the first time,
             * a reset is needed
             */
            jest.resetModules();
            jest.doMock('~api', () => ({
                __esModule: true,
                addEventListener: addEventListenerMock,
                removeEventListener: removeEventListenerMock,
                ...apiMocks,
                moveObjects: moveObjectsMock
            }), { virtual: true });

            store = mockVuexStore({
                workflow: await import('~/store/workflow')
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

            expect(store.state.workflow.activeWorkflow).toStrictEqual({ projectId: 'foo' });
        });

        it('allows setting the snapshot ID', () => {
            store.commit('workflow/setActiveSnapshotId', 'myId');
            expect(store.state.workflow.activeSnapshotId).toBe('myId');
        });

        it('allows setting the tooltip', () => {
            store.commit('workflow/setTooltip', { dummy: true });
            expect(store.state.workflow.tooltip).toStrictEqual({ dummy: true });
        });

        it('selects all nodes', () => {
            let workflow = {
                projectId: 'bar',
                nodes: {
                    'root:1': { id: 'root:1' },
                    'root:2': { id: 'root:2' }
                },
                info: {}
            };
            store.commit('workflow/setActiveWorkflow', workflow);

            let nodes = store.state.workflow.activeWorkflow.nodes;

            store.commit('workflow/selectAllNodes');
            expect(nodes['root:1'].selected).toBe(true);
            expect(nodes['root:2'].selected).toBe(true);
            expect(store.getters['workflow/selectedNodes']).toStrictEqual([
                workflow.nodes['root:1'],
                workflow.nodes['root:2']
            ]);

            store.commit('workflow/deselectNode', 'root:1');
            expect(nodes['root:1'].selected).toBe(false);
            expect(nodes['root:2'].selected).toBe(true);
            expect(store.getters['workflow/selectedNodes']).toStrictEqual([
                workflow.nodes['root:2']
            ]);

            store.commit('workflow/selectNode', 'root:1');
            expect(nodes['root:1'].selected).toBe(true);
            expect(nodes['root:2'].selected).toBe(true);
            expect(store.getters['workflow/selectedNodes']).toStrictEqual([
                workflow.nodes['root:1'],
                workflow.nodes['root:2']
            ]);

            store.commit('workflow/deselectAllNodes');
            expect(nodes['root:1'].selected).toBe(false);
            expect(nodes['root:2'].selected).toBe(false);
            expect(store.getters['workflow/selectedNodes']).toStrictEqual([]);

        });

        it('shifts the position of a node', () => {
            store.commit('workflow/setActiveWorkflow', {
                projectId: 'bar',
                nodes: {
                    'root:1': { id: 'root:1', position: { x: 0, y: 0 } }
                }
            });

            let node = store.state.workflow.activeWorkflow.nodes['root:1'];
            store.commit('workflow/shiftPosition', { node, deltaX: 50, deltaY: 50 });
            expect(store.state.workflow.deltaMovePosition).toStrictEqual({ x: 50, y: 50 });
        });

        it('resets the position of the outlint', () => {
            store.commit('workflow/setActiveWorkflow', {
                projectId: 'bar',
                nodes: {
                    'root:1': { id: 'root:1', position: { x: 0, y: 0 } }
                }
            });

            let node = store.state.workflow.activeWorkflow.nodes['root:1'];
            store.commit('workflow/shiftPosition', { node, deltaX: 50, deltaY: 50 });
            expect(store.state.workflow.deltaMovePosition).toStrictEqual({ x: 50, y: 50 });
            store.commit('workflow/resetDragPosition', { nodeId: node.id });
            expect(store.state.workflow.deltaMovePosition).toStrictEqual({ x: 0, y: 0 });
        });

        it('checks node dragging', () => {
            store.commit('workflow/setActiveWorkflow', {
                projectId: 'bar',
                nodes: {
                    'root:1': { id: 'root:1' }
                }
            });

            store.commit('workflow/setDragging', { isDragging: true });
            expect(store.state.workflow.isDragging).toBe(true);
            store.commit('workflow/setDragging', { isDragging: false });
            expect(store.state.workflow.isDragging).toBe(false);
        });

    });

    describe('workflow getters', () => {

        beforeEach(async () => {
            await loadStore();
            store.commit('workflow/setActiveWorkflow', {
                projectId: 'foo',
                info: {
                    linked: true,
                    jobManager: 'someJobManager'
                }
            });
        });

        it('check linked', () => {
            expect(store.getters['workflow/isLinked']).toBe(true);
        });

        it('check isWritable', () => {
            expect(store.getters['workflow/isWritable']).toBe(false);
            store.commit('workflow/setActiveWorkflow', {
                projectId: 'foo',
                info: {
                    linked: false
                }
            });
            expect(store.getters['workflow/isWritable']).toBe(true);
        });

        it('check isStreaming', () => {
            expect(store.getters['workflow/isStreaming']).toBe(true);
        });
    });

    describe('actions', () => {
        it('loads root workflow successfully', async () => {
            let loadWorkflow = jest.fn().mockResolvedValue({ dummy: true, workflow: { info: {} }, snapshotId: 'snap' });
            await loadStore({
                apiMocks: {
                    loadWorkflow
                }
            });
            const commit = jest.spyOn(store, 'commit');

            await store.dispatch('workflow/loadWorkflow', { projectId: 'wf1' });

            expect(loadWorkflow).toHaveBeenCalledWith({ workflowId: 'root', projectId: 'wf1' });
            expect(commit).toHaveBeenNthCalledWith(1, 'workflow/setActiveWorkflow', {
                info: {},
                projectId: 'wf1'
            }, undefined);
            expect(commit).toHaveBeenNthCalledWith(2, 'workflow/setActiveSnapshotId', 'snap', undefined);
            expect(addEventListenerMock).toHaveBeenCalledWith('WorkflowChanged', {
                projectId: 'wf1',
                workflowId: 'root',
                snapshotId: 'snap'
            });
        });

        it('loads inner workflow successfully', async () => {
            let loadWorkflow = jest.fn().mockResolvedValue({ workflow: { dummy: true, info: {} } });
            await loadStore({
                apiMocks: {
                    loadWorkflow
                }
            });
            const commit = jest.spyOn(store, 'commit');

            await store.dispatch('workflow/loadWorkflow', { projectId: 'wf2', workflowId: 'root:0:123' });

            expect(loadWorkflow).toHaveBeenCalledWith({ workflowId: 'root:0:123', projectId: 'wf2' });
            expect(commit).toHaveBeenNthCalledWith(1, 'workflow/setActiveWorkflow', {
                dummy: true,
                info: {},
                projectId: 'wf2'
            }, undefined);
            expect(addEventListenerMock).toHaveBeenCalledWith('WorkflowChanged', {
                projectId: 'wf2',
                workflowId: 'root'
            });
        });

        it('unloads workflow when another one is loaded', async () => {
            let loadWorkflow = jest.fn().mockResolvedValue({ workflow: { dummy: true, info: {} }, snapshotId: 'snap' });
            await loadStore({
                apiMocks: {
                    loadWorkflow
                }
            });
            await store.dispatch('workflow/loadWorkflow', { projectId: 'wf1', workflowId: 'root:0:12' });
            await store.dispatch('workflow/loadWorkflow', { projectId: 'wf2', workflowId: 'root:0:23' });
            expect(removeEventListenerMock).toHaveBeenCalledWith('WorkflowChanged', {
                projectId: 'wf1',
                workflowId: 'root',
                snapshotId: 'snap'
            });
        });

        // describe used for debugging
        describe('each', () => {
            it.each([
                ['executeNodes', 'execute'],
                ['cancelNodeExecution', 'cancel'],
                ['resetNodes', 'reset']
            ])('passes %s to API', async (fn, action) => {
                let mock = jest.fn();
                let apiMocks = { changeNodeState: mock };
                await loadStore({ apiMocks });
                store.commit('workflow/setActiveWorkflow', { projectId: 'foo', info: {} });

                store.dispatch(`workflow/${fn}`, ['x', 'y']);

                expect(mock).toHaveBeenCalledWith({
                    nodeIds: ['x', 'y'], projectId: 'foo', action, workflowId: 'root'
                });
            });

            it.each([
                ['pauseNodeExecution', 'pause'],
                ['resumeNodeExecution', 'resume'],
                ['stepNodeExecution', 'step']
            ])('passes %s to API', async (fn, action) => {
                let mock = jest.fn();
                let apiMocks = { changeLoopState: mock };
                await loadStore({ apiMocks });
                store.commit('workflow/setActiveWorkflow', { projectId: 'foo', info: {} });

                store.dispatch(`workflow/${fn}`, 'node x');

                expect(mock).toHaveBeenCalledWith({ nodeId: 'node x', projectId: 'foo', action });
            });
        });

        test('overloaded changeNodeState', async () => {
            let mock = jest.fn();
            let apiMocks = { changeNodeState: mock };
            await loadStore({ apiMocks });
            store.commit('workflow/setActiveWorkflow', {
                projectId: 'foo',
                info: {},
                nodes: {
                    'root:1': { id: 'root:1' },
                    'root:2': { id: 'root:2' }
                }
            });

            store.dispatch(`workflow/changeNodeState`, { nodes: 'all' });
            expect(mock).toHaveBeenLastCalledWith({ nodeIds: ['root'], projectId: 'foo', workflowId: 'root' });

            store.commit('workflow/selectAllNodes');
            store.dispatch(`workflow/changeNodeState`, { nodes: 'selected' });
            expect(mock).toHaveBeenLastCalledWith({
                nodeIds: ['root:1', 'root:2'], projectId: 'foo', workflowId: 'root'
            });

            store.dispatch(`workflow/changeNodeState`, { nodes: ['root:2'] });
            expect(mock).toHaveBeenLastCalledWith({ nodeIds: ['root:2'], projectId: 'foo', workflowId: 'root' });
        });

        it.each(['openView', 'openDialog'])('passes %s to API', async (action) => {
            let mock = jest.fn();
            let apiMocks = { [action]: mock };
            await loadStore({ apiMocks });
            store.commit('workflow/setActiveWorkflow', { projectId: 'foo' });

            store.dispatch(`workflow/${action}`, 'node x');

            expect(mock).toHaveBeenCalledWith({ nodeId: 'node x', projectId: 'foo' });
        });

        it('moves actual nodes', async () => {
            await loadStore();
            store.commit('workflow/setActiveWorkflow', {
                projectId: 'bar',
                nodes: {
                    foo: { bla: 1, position: { x: 0, y: 0 } },
                    bar: { qux: 2, position: { x: 50, y: 50 } }
                }
            });
            store.commit('workflow/selectAllNodes');
            await Vue.nextTick();

            store.dispatch('workflow/moveNodes', { deltaX: 50, deltaY: 50 });
            expect(store.state.workflow.deltaMovePosition).toStrictEqual({ x: 50, y: 50 });
            expect(store.state.workflow.moveNodeGhostThresholdExceeded).toBe(false);
        });

        it('moves nodes outline', async () => {
            await loadStore();
            let nodesArray = {};
            for (let i = 0; i < 11; i++) {
                let name = `node-${i}`;
                nodesArray[name] = { bla: 1, position: { x: 0, y: 0 } };
            }
            store.commit('workflow/setActiveWorkflow', {
                projectId: 'bar',
                nodes: nodesArray
            });
            store.commit('workflow/selectAllNodes');
            await Vue.nextTick();

            store.dispatch('workflow/moveNodes', { deltaX: 50, deltaY: 50 });

            expect(store.state.workflow.deltaMovePosition).toStrictEqual({ x: 50, y: 50 });
            expect(store.state.workflow.moveNodeGhostThresholdExceeded).toBe(true);
        });

        it('moves subset of node outlines', async () => {
            await loadStore();
            let nodesArray = {};
            for (let i = 0; i < 21; i++) {
                let name = `node-${i}`;
                nodesArray[name] = { bla: 1, position: { x: 0, y: 0 } };
            }
            store.commit('workflow/setActiveWorkflow', {
                projectId: 'bar',
                nodes: nodesArray
            });
            await Vue.nextTick();
            // select every even node
            Object.keys(nodesArray).forEach((node, index) => {
                if (index % 2 === 0) {
                    store.commit('workflow/selectNode', node);
                }
            });

            store.dispatch('workflow/moveNodes', { deltaX: 50, deltaY: 50 });

            expect(store.state.workflow.deltaMovePosition).toStrictEqual({ x: 50, y: 50 });
            expect(store.state.workflow.moveNodeGhostThresholdExceeded).toBe(true);
        });

        it.each([
            [1],
            [20]
        ])('saves position after move end for %s nodes', async (amount) => {
            await loadStore();
            let nodesArray = {};
            for (let i = 0; i < amount; i++) {
                let name = `node-${i}`;
                nodesArray[name] = { bla: 1, position: { x: 0, y: 0 } };
            }
            store.commit('workflow/setActiveWorkflow', {
                nodes: nodesArray,
                info: {
                    containerId: 'test'
                }
            });
            await Vue.nextTick();
            let nodeIds = [];
            Object.keys(nodesArray).forEach((node) => {
                store.commit('workflow/selectNode', node);
                nodeIds.push(node.id);
            });

            store.dispatch('workflow/moveNodes', { deltaX: 50, deltaY: 50 });
            store.dispatch('workflow/saveNodeMoves', { projectId: 'foo', nodeId: 'node-0', startPos: { x: 0, y: 0 } });
            expect(moveObjectsMock).toHaveBeenNthCalledWith(1, {
                projectId: 'foo',
                nodeIds,
                workflowId: 'test',
                translation: { x: 50, y: 50 },
                annotationIds: []
            });
        });
    });

    describe('getters', () => {
        test('isLinked', async () => {
            await loadStore();
            store.commit('workflow/setActiveWorkflow', {
                info: {
                    linked: true
                }
            });
            expect(store.getters['workflow/isLinked']).toBe(true);
        });

        test('isWritable', async () => {
            await loadStore();
            store.commit('workflow/setActiveWorkflow', {
                info: {
                    linked: true
                }
            });
            expect(store.getters['workflow/isWritable']).toBe(false);
        });

        describe('workflowBounds', () => {
            const {
                nodeSize, nodeStatusMarginTop, nodeStatusHeight, nodeNameMargin,
                nodeNameLineHeight
            } = $shapes;

            it('calculates dimensions of empty workflow', async () => {
                await loadStore();
                store.commit('workflow/setActiveWorkflow', {
                    projectId: 'foo',
                    nodes: {},
                    workflowAnnotations: []
                });

                expect(store.getters['workflow/workflowBounds']).toStrictEqual({
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0
                });
            });

            it('calculates dimensions of workflow containing one node away from the top left corner', async () => {
                await loadStore();
                store.commit('workflow/setActiveWorkflow', {
                    projectId: 'foo',
                    nodes: {
                        'root:0': {
                            position: { x: 200, y: 200 }
                        }
                    },
                    workflowAnnotations: []
                });

                expect(store.getters['workflow/workflowBounds']).toStrictEqual({
                    left: 200,
                    right: 200 + nodeSize,
                    top: 200 - nodeNameMargin - nodeNameLineHeight,
                    bottom: 200 + nodeSize + nodeStatusMarginTop + nodeStatusHeight
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
                    }, {
                        id: 'root:2',
                        bounds: {
                            x: 0,
                            y: 0,
                            width: 20,
                            height: 20
                        }
                    }, {
                        id: 'root:3',
                        bounds: {
                            x: -5,
                            y: -5,
                            width: 20,
                            height: 20
                        }
                    }]
                });


                expect(store.getters['workflow/workflowBounds']).toStrictEqual({
                    left: -10,
                    right: 20,
                    top: -10,
                    bottom: 20
                });
            });

            it('calculates dimensions of workflow containing overlapping node + annotation', async () => {
                await loadStore();
                store.commit('workflow/setActiveWorkflow', {
                    projectId: 'foo',
                    nodes: { 'root:0': { position: { x: 10, y: 10 } } },
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
            });

            it('calculates dimensions of workflow containing multiple nodes', async () => {
                await loadStore();
                store.commit('workflow/setActiveWorkflow', {
                    projectId: 'foo',
                    nodes: {
                        'root:0': { position: { x: 10, y: 10 } },
                        'root:1': { position: { x: -10, y: -10 } },
                        'root:2': { position: { x: 20, y: 20 } }
                    }
                });

                expect(store.getters['workflow/workflowBounds']).toStrictEqual({
                    left: -10,
                    right: 52,
                    top: -36,
                    bottom: 72
                });
            });
        });

        describe('node getters', () => {

            beforeEach(async () => {
                await loadStore();
                store.commit('workflow/setActiveWorkflow', {
                    projectId: 'foo',
                    nodes: {
                        foo: {
                            templateId: 'bla'
                        },
                        ownData: {
                            icon: 'ownIcon',
                            name: 'ownName',
                            type: 'ownType',
                            executionInfo: { jobManager: 'test' }
                        }
                    },
                    nodeTemplates: {
                        bla: {
                            icon: 'exampleIcon',
                            name: 'exampleName',
                            type: 'exampleType'
                        }
                    }
                });
            });

            it('gets name', () => {
                expect(store.getters['workflow/nodeName']({ nodeId: 'foo' })).toBe('exampleName');
                expect(store.getters['workflow/nodeName']({ nodeId: 'ownData' })).toBe('ownName');
            });
            it('gets icon', () => {
                expect(store.getters['workflow/nodeIcon']({ nodeId: 'foo' })).toBe('exampleIcon');
                expect(store.getters['workflow/nodeIcon']({ nodeId: 'ownData' })).toBe('ownIcon');
            });
            it('gets type', () => {
                expect(store.getters['workflow/nodeType']({ nodeId: 'foo' })).toBe('exampleType');
                expect(store.getters['workflow/nodeType']({ nodeId: 'ownData' })).toBe('ownType');
            });
        });
    });
});
