/* eslint-disable no-magic-numbers */
/* eslint-disable max-lines */
import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';

import Vuex from 'vuex';
import Vue from 'vue';

describe('workflow store: Editing', () => {
    let store, localVue, loadStore, moveObjectsMock, deleteObjectsMock;

    beforeAll(() => {
        localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
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

    describe('mutation', () => {
        beforeEach(async () => {
            await loadStore();
        });

        it('shifts the position of a node', () => {
            store.commit('workflow/setActiveWorkflow', {
                projectId: 'bar',
                nodes: {
                    'root:1': { id: 'root:1', position: { x: 0, y: 0 } }
                }
            });

            let node = store.state.workflow.activeWorkflow.nodes['root:1'];
            store.commit('workflow/setMovePreview', { node, deltaX: 50, deltaY: 50 });
            expect(store.state.workflow.movePreviewDelta).toStrictEqual({ x: 50, y: 50 });
        });

        it('resets the position of the outlint', () => {
            store.commit('workflow/setActiveWorkflow', {
                projectId: 'bar',
                nodes: {
                    'root:1': { id: 'root:1', position: { x: 0, y: 0 } }
                }
            });

            let node = store.state.workflow.activeWorkflow.nodes['root:1'];
            store.commit('workflow/setMovePreview', { node, deltaX: 50, deltaY: 50 });
            expect(store.state.workflow.movePreviewDelta).toStrictEqual({ x: 50, y: 50 });
            store.commit('workflow/resetMovePreview', { nodeId: node.id });
            expect(store.state.workflow.movePreviewDelta).toStrictEqual({ x: 0, y: 0 });
        });
    });

    describe('actions', () => {
        it('can add ContainerNode Ports', async () => {
            let apiMocks = { addContainerNodePort: jest.fn() };
            await loadStore({ apiMocks });

            store.commit('workflow/setActiveWorkflow', { projectId: 'foo' });
            store.dispatch(`workflow/addContainerNodePort`, { nodeId: 'node x', side: 'input', typeId: 'porty' });

            expect(apiMocks.addContainerNodePort).toHaveBeenCalledWith(
                { nodeId: 'node x', projectId: 'foo', workflowId: 'root', side: 'input', typeId: 'porty' }
            );
        });

        it('can remove ContainerNode Ports', async () => {
            let apiMocks = { removeContainerNodePort: jest.fn() };
            await loadStore({ apiMocks });

            const payload = { nodeId: 'node x', side: 'input', typeId: 'porty', portIndex: 1 };
            store.commit('workflow/setActiveWorkflow', { projectId: 'foo' });
            store.dispatch(`workflow/removeContainerNodePort`, payload);

            expect(apiMocks.removeContainerNodePort).toHaveBeenCalledWith(
                { ...payload, projectId: 'foo', workflowId: 'root' }
            );
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

            store.commit('workflow/setMovePreview', { deltaX: 50, deltaY: 50 });
            expect(store.state.workflow.movePreviewDelta).toStrictEqual({ x: 50, y: 50 });
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
            store.commit('workflow/setMovePreview', { deltaX: 50, deltaY: 50 });

            expect(store.state.workflow.movePreviewDelta).toStrictEqual({ x: 50, y: 50 });
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
            store.commit('workflow/setMovePreview', { deltaX: 50, deltaY: 50 });

            expect(store.state.workflow.movePreviewDelta).toStrictEqual({ x: 50, y: 50 });
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

            store.commit('workflow/setMovePreview', { deltaX: 50, deltaY: 50 });
            store.dispatch('workflow/moveObjects', { projectId: 'foo', nodeId: 'node-0', startPos: { x: 0, y: 0 } });
            expect(moveObjectsMock).toHaveBeenNthCalledWith(1, {
                projectId: 'foo',
                nodeIds,
                workflowId: 'test',
                translation: { x: 50, y: 50 },
                annotationIds: []
            });
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

        describe('Collapse', () => {
            const loadStoreWithNodes = async ({ apiMocks }) => {
                await loadStore({ apiMocks });
                store.commit('workflow/setActiveWorkflow', {
                    projectId: 'bar',
                    nodes: {
                        foo: {
                            id: 'foo',
                            allowedActions: {
                                canCancel: false,
                                canCollapse: 'true',
                                canDelete: true,
                                canExecute: true,
                                canOpenDialog: true,
                                canReset: false
                            }
                        },
                        bar: {
                            id: 'bar',
                            allowedActions: {
                                canCancel: false,
                                canCollapse: 'true',
                                canDelete: true,
                                canExecute: true,
                                canOpenDialog: true,
                                canReset: false
                            }
                        }
                    }
                });
            };

            it('collapses nodes to a container', async () => {
                let collapseToContainer = jest.fn();
                let apiMocks = { collapseToContainer };
                await loadStoreWithNodes({ apiMocks });
                store.dispatch('selection/selectAllNodes');
    
                store.dispatch('workflow/collapseToContainer', {
                    containerType: 'metanode'
                });
    
                expect(collapseToContainer).toHaveBeenCalledWith({
                    projectId: 'bar',
                    workflowId: 'root',
                    nodeIds: ['foo', 'bar'],
                    containerType: 'metanode',
                    annotationIds: []
                });
            });
    
            it('selects the new container after collapsing nodes', async () => {
                const newNodeId = 'new-container';
                let collapseToContainer = jest.fn(() => ({ newNodeId }));
                let apiMocks = { collapseToContainer };
                await loadStoreWithNodes({ apiMocks });
                store.dispatch('selection/selectAllNodes');
    
                await store.dispatch('workflow/collapseToContainer', {
                    containerType: 'metanode'
                });
    
                expect(store.state.selection.selectedNodes).toEqual({ [newNodeId]: true });
                expect(store.state.workflow.nameEditorNodeId).toBe(newNodeId);
            });

            it('does not select new container if user made a selection before collapse command finishes', async () => {
                const newNodeId = 'new-container';
                let collapseToContainer = jest.fn(() => ({ newNodeId }));
                let apiMocks = { collapseToContainer };
                await loadStoreWithNodes({ apiMocks });
                store.dispatch('selection/selectAllNodes');
    
                const commandCall = store.dispatch('workflow/collapseToContainer', {
                    containerType: 'metanode'
                });

                store.dispatch('selection/selectNode', 'foo');

                await commandCall;
    
                expect(store.state.selection.selectedNodes).toStrictEqual({ foo: true });
                expect(store.state.workflow.nameEditorNodeId).toBe(null);
            });
        });

        describe('Expand', () => {
            const loadStoreWithNodes = async ({ apiMocks }) => {
                await loadStore({ apiMocks });
                store.commit('workflow/setActiveWorkflow', {
                    projectId: 'bar',
                    nodes: {
                        foo: {
                            id: 'foo',
                            kind: 'metanode',
                            allowedActions: {
                                canCancel: false,
                                canCollapse: 'true',
                                canDelete: true,
                                canExecute: true,
                                canOpenDialog: true,
                                canReset: false,
                                canExpand: 'true'
                            }
                        },
                        barbaz: {
                            id: 'barbaz',
                            allowedActions: {
                                canCancel: false,
                                canCollapse: 'true',
                                canDelete: true,
                                canExecute: true,
                                canOpenDialog: true,
                                canReset: false
                            }
                        }
                    }
                });
            };

            it('expands a container node', async () => {
                let expandContainerNode = jest.fn();
                let apiMocks = { expandContainerNode };
                await loadStoreWithNodes({ apiMocks });
                store.dispatch('selection/selectNode', 'foo');
    
                store.dispatch('workflow/expandContainerNode');
    
                expect(expandContainerNode).toHaveBeenCalledWith({
                    projectId: 'bar',
                    workflowId: 'root',
                    nodeId: 'foo'
                });
            });

            it('selects the expanded nodes after the command finishes', async () => {
                const expandedNodeIds = ['foo', 'bar'];

                let expandContainerNode = jest.fn(() => ({ expandedNodeIds }));
                let apiMocks = { expandContainerNode };
                await loadStoreWithNodes({ apiMocks });
                store.dispatch('selection/selectNode', 'foo');
    
                await store.dispatch('workflow/expandContainerNode');
    
                expect(store.state.selection.selectedNodes).toEqual({ foo: true, bar: true });
            });

            it('does not select the expanded nodes if user selected something before command ends', async () => {
                const expandedNodeIds = ['bar', 'baz'];

                let expandContainerNode = jest.fn(() => ({ expandedNodeIds }));
                let apiMocks = { expandContainerNode };
                await loadStoreWithNodes({ apiMocks });
                store.dispatch('selection/selectNode', 'foo');
    
                const commandCall = store.dispatch('workflow/expandContainerNode');

                await store.dispatch('selection/selectNode', 'barbaz');

                await commandCall;
    
                expect(store.state.selection.selectedNodes).toStrictEqual({ barbaz: true });
            });
        });
    });
});
