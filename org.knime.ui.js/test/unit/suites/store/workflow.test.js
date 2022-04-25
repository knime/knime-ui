/* eslint-disable no-magic-numbers */
/* eslint-disable max-lines */
import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';
import * as $shapes from '~/style/shapes';
import Vuex from 'vuex';
import Vue from 'vue';

describe('workflow store', () => {
    let store, localVue, loadStore, addEventListenerMock, removeEventListenerMock, moveObjectsMock, deleteObjectsMock;

    beforeAll(() => {
        localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        addEventListenerMock = jest.fn();
        removeEventListenerMock = jest.fn();
        store = null;
        moveObjectsMock = jest.fn().mockReturnValue(Promise.resolve());
        deleteObjectsMock = jest.fn().mockReturnValue(Promise.resolve());

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
                moveObjects: moveObjectsMock,
                deleteObjects: deleteObjectsMock
            }), { virtual: true });

            store = mockVuexStore({
                workflow: await import('~/store/workflow'),
                selection: await import('~/store/selection')
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
            let loadWorkflow =
            jest.fn().mockResolvedValue({ dummy: true, workflow: { info: {}, nodes: [] }, snapshotId: 'snap' });

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
                nodes: [],
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
            let loadWorkflow = jest.fn().mockResolvedValue({ workflow: { dummy: true, info: {}, nodes: [] } });

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
                nodes: [],
                projectId: 'wf2'
            }, undefined);
            expect(addEventListenerMock).toHaveBeenCalledWith('WorkflowChanged', {
                projectId: 'wf2',
                workflowId: 'root'
            });
        });

        it('unloads workflow when another one is loaded', async () => {
            let loadWorkflow =
            jest.fn().mockResolvedValue({ workflow: { dummy: true, info: {}, nodes: [] }, snapshotId: 'snap' });

            await loadStore({
                apiMocks: {
                    loadWorkflow
                }
            });
            await store.dispatch('workflow/loadWorkflow', { projectId: 'wf1', workflowId: 'root:0:12' });
            await store.dispatch('workflow/unloadActiveWorkflow', { clearWorkflow: true });

            expect(removeEventListenerMock).toHaveBeenCalledWith('WorkflowChanged', {
                projectId: 'wf1',
                workflowId: 'root',
                snapshotId: 'snap'
            });
            expect(store.state.workflow.activeWorkflow).toBe(null);
        });

        it('does not unload if there is no active workflow', async () => {
            let loadWorkflow = jest.fn().mockResolvedValue({ workflow: { dummy: true, info: {} }, snapshotId: 'snap' });
            await loadStore({
                apiMocks: {
                    loadWorkflow
                }
            });
            await store.dispatch('workflow/unloadActiveWorkflow', { clearWorkflow: false });

            expect(removeEventListenerMock).not.toHaveBeenCalled();
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
                ['pauseLoopExecution', 'pause'],
                ['resumeLoopExecution', 'resume'],
                ['stepLoopExecution', 'step']
            ])('passes %s to API', async (fn, action) => {
                let mock = jest.fn();
                let apiMocks = { changeLoopState: mock };
                await loadStore({ apiMocks });
                store.commit('workflow/setActiveWorkflow', { projectId: 'foo', info: {} });

                store.dispatch(`workflow/${fn}`, 'node x');

                expect(mock).toHaveBeenCalledWith({ nodeId: 'node x', projectId: 'foo', action, workflowId: 'root' });
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
            expect(mock).toHaveBeenLastCalledWith({ projectId: 'foo', workflowId: 'root' });

            store.dispatch('selection/selectAllNodes');
            store.dispatch(`workflow/changeNodeState`, { nodes: 'selected' });
            expect(mock).toHaveBeenLastCalledWith({
                nodeIds: ['root:1', 'root:2'], projectId: 'foo', workflowId: 'root'
            });

            store.dispatch(`workflow/changeNodeState`, { nodes: ['root:2'] });
            expect(mock).toHaveBeenLastCalledWith({ nodeIds: ['root:2'], projectId: 'foo', workflowId: 'root' });
        });

        it.each(['openView', 'openDialog', 'openLegacyFlowVariableDialog'])('passes %s to API', async (action) => {
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
            store.dispatch('selection/selectAllNodes');
            await Vue.nextTick();

            store.dispatch('workflow/moveNodes', { deltaX: 50, deltaY: 50 });
            expect(store.state.workflow.deltaMovePosition).toStrictEqual({ x: 50, y: 50 });
        });

        it('moves nodes outline', async () => {
            await loadStore();
            let nodesArray = {};
            for (let i = 0; i < 11; i++) {
                let name = `node-${i}`;
                nodesArray[name] = { bla: 1, position: { x: 0, y: 0 }, id: `node-${i}` };
            }
            store.commit('workflow/setActiveWorkflow', {
                projectId: 'bar',
                nodes: nodesArray
            });
            store.dispatch('selection/selectAllNodes');
            await Vue.nextTick();
            store.dispatch('workflow/moveNodes', { deltaX: 50, deltaY: 50 });

            expect(store.state.workflow.deltaMovePosition).toStrictEqual({ x: 50, y: 50 });
        });

        it('moves subset of node outlines', async () => {
            await loadStore();
            let nodesArray = {};
            for (let i = 0; i < 21; i++) {
                let name = `node-${i}`;
                nodesArray[name] = { bla: 1, position: { x: 0, y: 0 }, id: name };
            }
            store.commit('workflow/setActiveWorkflow', {
                projectId: 'bar',
                nodes: nodesArray
            });
            await Vue.nextTick();
            // select every even node
            Object.values(nodesArray).forEach((node, index) => {
                if (index % 2 === 0) {
                    store.dispatch('selection/selectNode', node.id);
                }
            });
            store.dispatch('workflow/moveNodes', { deltaX: 50, deltaY: 50 });

            expect(store.state.workflow.deltaMovePosition).toStrictEqual({ x: 50, y: 50 });
        });

        it.each([
            [1],
            [20]
        ])('saves position after move end for %s nodes', async (amount) => {
            await loadStore();
            let nodesArray = {};
            for (let i = 0; i < amount; i++) {
                let name = `node-${i}`;
                nodesArray[name] = { bla: 1, position: { x: 0, y: 0 }, id: name };
            }
            store.commit('workflow/setActiveWorkflow', {
                nodes: nodesArray,
                info: {
                    containerId: 'test'
                }
            });
            await Vue.nextTick();
            let nodeIds = [];
            Object.values(nodesArray).forEach((node) => {
                store.dispatch('selection/selectNode', node.id);
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

        it('passes undo to the API', async () => {
            let undo = jest.fn();
            let apiMocks = { undo };
            await loadStore({ apiMocks });
            store.commit('workflow/setActiveWorkflow', { projectId: 'foo' });

            store.dispatch('workflow/undo');

            expect(undo).toHaveBeenCalledWith({ projectId: 'foo', workflowId: 'root' });
        });

        it('passes redo to the API', async () => {
            let redo = jest.fn();
            let apiMocks = { redo };
            await loadStore({ apiMocks });
            store.commit('workflow/setActiveWorkflow', { projectId: 'foo' });

            store.dispatch('workflow/redo');

            expect(redo).toHaveBeenCalledWith({ projectId: 'foo', workflowId: 'root' });
        });

        it.each([
            [1],
            [20]
        ])('deletes %s objects', async (amount) => {
            await loadStore();
            let nodesArray = {};
            let connectionsArray = {};
            let nodeIds = [];
            let connectionIds = [];
            for (let i = 0; i < amount / 2; i++) {
                let id = `node-${i}`;
                nodesArray[id] = { id, allowedActions: { canDelete: true } };
                store.dispatch('selection/selectNode', id);
                nodeIds.push(id);
            }
            for (let i = 0; i < amount / 2; i++) {
                let id = `connection-${i}`;
                connectionsArray[id] = { id, allowedActions: { canDelete: true } };
                store.dispatch('selection/selectConnection', id);
                connectionIds.push(id);
            }
            store.commit('workflow/setActiveWorkflow', {
                nodes: nodesArray,
                connections: connectionsArray,
                projectId: 'foo',
                info: {
                    containerId: 'test'
                }
            });
            await Vue.nextTick();
            store.dispatch('workflow/deleteSelectedObjects');
            expect(deleteObjectsMock).toHaveBeenNthCalledWith(1, {
                projectId: 'foo',
                workflowId: 'test',
                nodeIds,
                connectionIds
            });
        });

        describe('tries to delete objects that cannot be deleted', () => {
            jest.spyOn(window, 'alert').mockImplementation(() => { });

            let nodeName = `node-1`;
            let connectorName = `connection-1`;
            let nodesArray = {};
            nodesArray[nodeName] = { id: nodeName, allowedActions: { canDelete: false } };
            let connectionsArray = {};
            connectionsArray[connectorName] = { id: connectorName, allowedActions: { canDelete: false } };

            beforeEach(async () => {
                await loadStore();

                store.commit('workflow/setActiveWorkflow', {
                    nodes: nodesArray,
                    connections: connectionsArray,
                    projectId: 'foo',
                    info: {
                        containerId: 'test'
                    }
                });
            });

            test('nodes', async () => {
                store.dispatch('selection/selectNode', nodesArray[nodeName].id);

                await Vue.nextTick();
                store.dispatch('workflow/deleteSelectedObjects');
                expect(window.alert).toHaveBeenCalledWith(
                    `The following nodes can’t be deleted: [node-1]`
                );
            });

            test('connections', async () => {
                store.dispatch('selection/selectConnection', connectionsArray[connectorName].id);

                await Vue.nextTick();
                store.dispatch('workflow/deleteSelectedObjects');
                expect(window.alert).toHaveBeenCalledWith(
                    `The following connections can’t be deleted: [connection-1]`
                );
            });

            test('nodes and connections', async () => {
                store.dispatch('selection/selectNode', nodesArray[nodeName].id);
                store.dispatch('selection/selectConnection', connectionsArray[connectorName].id);

                await Vue.nextTick();
                store.dispatch('workflow/deleteSelectedObjects');
                expect(window.alert).toHaveBeenCalledWith(
                    `The following nodes can’t be deleted: [node-1] \n` +
                    `The following connections can’t be deleted: [connection-1]`
                );
            });
        });

        it('connects nodes', async () => {
            let connectNodes = jest.fn();
            let apiMocks = { connectNodes };
            await loadStore({ apiMocks });
            store.commit('workflow/setActiveWorkflow', { projectId: 'foo' });

            store.dispatch('workflow/connectNodes', {
                sourceNode: 'source:1',
                sourcePort: 0,
                destNode: 'dest:1',
                destPort: 1
            });

            expect(connectNodes).toHaveBeenCalledWith({
                projectId: 'foo',
                workflowId: 'root',
                sourceNode: 'source:1',
                sourcePort: 0,
                destNode: 'dest:1',
                destPort: 1
            });
        });

        it('saves the workflow via the API', async () => {
            let saveWorkflow = jest.fn();
            let apiMocks = { saveWorkflow };
            await loadStore({ apiMocks });
            store.commit('workflow/setActiveWorkflow', { projectId: 'foo' });

            store.dispatch('workflow/saveWorkflow');

            expect(saveWorkflow).toHaveBeenCalledWith({ projectId: 'foo' });
        });

        it('closes the workflow via the API', async () => {
            let closeWorkflow = jest.fn();
            let apiMocks = { closeWorkflow };
            await loadStore({ apiMocks });
            store.commit('workflow/setActiveWorkflow', { projectId: 'foo' });

            store.dispatch('workflow/closeWorkflow');

            expect(closeWorkflow).toHaveBeenCalledWith({ projectId: 'foo' });
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

        test('isInsideLinked defaults to false', async () => {
            await loadStore();
            store.commit('workflow/setActiveWorkflow', {
                parents: [{
                    containerType: 'component',
                    linked: false
                }]
            });
            expect(store.getters['workflow/isInsideLinked']).toBe(false);
        });

        test('isInsideLinked', async () => {
            await loadStore();
            store.commit('workflow/setActiveWorkflow', {
                parents: [{
                    containerType: 'metanode',
                    linked: true
                }]
            });
            expect(store.getters['workflow/isInsideLinked']).toBe(true);
        });

        test('insideLinkedType', async () => {
            await loadStore();
            store.commit('workflow/setActiveWorkflow', {
                parents: [{
                    containerType: 'metanode',
                    linked: true
                }]
            });
            expect(store.getters['workflow/insideLinkedType']).toBe('metanode');
        });

        test('isWorkflowEmpty', async () => {
            await loadStore();
            store.commit('workflow/setActiveWorkflow', {
                projectId: 'foo',
                nodes: [],
                workflowAnnotations: []
            });
            expect(store.getters['workflow/isWorkflowEmpty']).toBe(true);

            store.commit('workflow/setActiveWorkflow', {
                projectId: 'foo',
                nodes: [{ node: { id: 1 } }],
                workflowAnnotations: []
            });

            store.commit('workflow/setActiveWorkflow', {
                projectId: 'foo',
                nodes: [],
                workflowAnnotations: ['something']
            });
            expect(store.getters['workflow/isWorkflowEmpty']).toBe(false);
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
                    left: 150,
                    right: 250 + nodeSize,
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
                    left: -40,
                    right: 92,
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
                    left: -60,
                    right: 102,
                    top: -36,
                    bottom: 72
                });
            });

            it('calculates dimensions of not active workflow', async () => {
                await loadStore();

                expect(store.getters['workflow/workflowBounds']).toStrictEqual({
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0
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
                expect(store.getters['workflow/getNodeName']('foo')).toBe('exampleName');
                expect(store.getters['workflow/getNodeName']('ownData')).toBe('ownName');
            });

            it('gets icon', () => {
                expect(store.getters['workflow/getNodeIcon']('foo')).toBe('exampleIcon');
                expect(store.getters['workflow/getNodeIcon']('ownData')).toBe('ownIcon');
            });

            it('gets type', () => {
                expect(store.getters['workflow/getNodeType']('foo')).toBe('exampleType');
                expect(store.getters['workflow/getNodeType']('ownData')).toBe('ownType');
            });
        });
    });
});
