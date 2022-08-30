/* eslint-disable no-magic-numbers */
/* eslint-disable max-lines */
import Vue from 'vue';
import Vuex from 'vuex';
import { createLocalVue } from '@vue/test-utils';

import { mockVuexStore } from '@/test/test-utils';

import { wrapAPI } from '../workflowEditor';

describe('workflow store: Editing', () => {
    let store, localVue, loadStore, moveObjectsMock, deleteObjectsMock, pastePartsAtMock;

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
             * We have to import the workflow-store dynamically to apply our @api mocks.
             * Because the module is cached after it is required for the first time,
             * a reset is needed
             */
            jest.resetModules();
            jest.doMock('@api', () => ({
                __esModule: true,
                ...apiMocks,
                moveObjects: moveObjectsMock,
                deleteObjects: deleteObjectsMock
            }), { virtual: true });

            pastePartsAtMock = jest.fn();
            jest.doMock('@/util/pasteToWorkflow', () => ({
                __esModule: true,
                pastePartsAt: pastePartsAtMock
            }));

            store = mockVuexStore({
                application: await import('@/store/application'),
                workflow: await import('@/store/workflow'),
                selection: await import('@/store/selection'),
                canvas: {
                    getters: {
                        getVisibleFrame() {
                            return () => ({
                                left: -500,
                                top: -500,
                                width: 1000,
                                height: 1000
                            });
                        }
                    }
                }
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
        test('wrap api call: automatically include projectId and workflowId', () => {
            let apiCall = jest.fn();

            let wrappedCall = wrapAPI(apiCall);

            let vuexContext = {
                state: {
                    activeWorkflow: {
                        projectId: 'p1',
                        info: { containerId: 'w1' }
                    }
                }
            };

            wrappedCall(vuexContext);
            expect(apiCall).toHaveBeenCalledWith({
                projectId: 'p1',
                workflowId: 'w1'
            });

            wrappedCall(vuexContext, { arg1: 'value' });
            expect(apiCall).toHaveBeenCalledWith({
                projectId: 'p1',
                workflowId: 'w1',
                arg1: 'value'
            });
        });

        it('can add Node Ports', async () => {
            let apiMocks = { addNodePort: jest.fn() };
            await loadStore({ apiMocks });

            store.commit('workflow/setActiveWorkflow', { projectId: 'foo', info: { containerId: 'root' } });
            store.dispatch(`workflow/addNodePort`,
                { nodeId: 'node x', side: 'input', typeId: 'porty', portGroup: 'group' });

            expect(apiMocks.addNodePort).toHaveBeenCalledWith({
                nodeId: 'node x',
                projectId: 'foo',
                workflowId: 'root',
                side: 'input',
                typeId: 'porty',
                portGroup: 'group'
            });
        });

        it('can remove Node Ports', async () => {
            let apiMocks = { removeNodePort: jest.fn() };
            await loadStore({ apiMocks });

            const payload = { nodeId: 'node x', side: 'input', typeId: 'porty', portIndex: 1, portGroup: 'group' };
            store.commit('workflow/setActiveWorkflow', { projectId: 'foo', info: { containerId: 'root' } });
            store.dispatch(`workflow/removeNodePort`, payload);

            expect(apiMocks.removeNodePort).toHaveBeenCalledWith(
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
            store.commit('workflow/setActiveWorkflow', { projectId: 'foo', info: { containerId: 'root' } });

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
                    info: {
                        containerId: 'root'
                    },
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
                    info: {
                        containerId: 'root'
                    },
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

        describe('Copy, Cut and Paste', () => {
            let clipboardObject;

            beforeEach(() => {
                Object.assign(navigator, {
                    clipboard: {
                        writeText: jest.fn().mockImplementation(text => {
                            clipboardObject = JSON.parse(text);
                        }),
                        readText: jest.fn().mockImplementation(() => clipboardObject
                            ? JSON.stringify(clipboardObject)
                            : '')
                    }
                });
            });

            afterEach(() => {
                jest.clearAllMocks();
            });

            it.each([
                ['copy'],
                ['cut']
            ])('executes <%s> command', async (command) => {
                let stringifiedPayload = JSON.stringify({
                    payloadIdentifier: 'p-id-1',
                    otherData: 'is here'
                });

                let copyOrCutWorkflowParts = jest.fn().mockReturnValue({
                    content: stringifiedPayload
                });
                let apiMocks = { copyOrCutWorkflowParts };
                await loadStore({ apiMocks });
    
                store.commit('application/setHasClipboardSupport', true);
                store.commit('workflow/setActiveWorkflow', {
                    projectId: 'my project',
                    info: { containerId: 'root' },
                    nodes: {
                        foo: {
                            id: 'foo',
                            position: { x: 0, y: 0 }
                        },
                        bar: {
                            id: 'bar',
                            position: { x: 50, y: 50 }
                        }
                    }
                });

                store.dispatch('selection/selectAllNodes');
                await Vue.nextTick();
                await store.dispatch('workflow/copyOrCutWorkflowParts', { command });
    
                expect(copyOrCutWorkflowParts).toHaveBeenCalledWith({
                    projectId: 'my project',
                    workflowId: 'root',
                    command,
                    nodeIds: ['foo', 'bar'],
                    annotationIds: []
                });

                expect(clipboardObject).toStrictEqual({
                    payloadIdentifier: 'p-id-1',
                    projectId: 'my project',
                    workflowId: 'root',
                    data: stringifiedPayload,
                    objectBounds: {
                        left: 0,
                        top: 0,
                        right: 50 + 32,
                        bottom: 50 + 32,
                        width: 50 + 32,
                        height: 50 + 32
                    }
                });
            });

            describe('executes paste command', () => {
                let workflow, doAfterPasteMock, pasteWorkflowParts, startPaste;

                beforeEach(async () => {
                    // register "pasteWorkflowParts" API function
                    pasteWorkflowParts = jest.fn().mockReturnValue({
                        nodeIds: ['bar']
                    });
                    let apiMocks = { pasteWorkflowParts };
                    await loadStore({ apiMocks });
                
                    // set up workflow
                    workflow = {
                        projectId: 'my project',
                        info: { containerId: 'root' },
                        nodes: { foo: { id: 'foo' }, bar: { id: 'bar' } },
                        workflowAnnotations: []
                    };
                    store.commit('workflow/setActiveWorkflow', workflow);

                    // mock current clipboard content
                    clipboardObject = {
                        objectBounds: {
                            width: 100,
                            height: 100
                        },
                        data: 'parts'
                    };

                    // mock strategy result
                    doAfterPasteMock = jest.fn();
                    pastePartsAtMock.mockReturnValue({
                        position: { x: 5, y: 5 },
                        doAfterPaste: doAfterPasteMock
                    });

                    // mock previous copy paste state
                    store.commit('workflow/setCopyPaste', {
                        dummy: null
                    });

                    // Start pasting
                    startPaste = (payload = {}) => store.dispatch('workflow/pasteWorkflowParts', payload);
                });

                it('calls partePartsAt', async () => {
                    await startPaste();

                    expect(pastePartsAtMock).toHaveBeenCalledWith({
                        visibleFrame: {
                            height: 1000,
                            width: 1000,
                            left: -500,
                            top: -500
                        },
                        clipboardContent: clipboardObject,
                        isWorkflowEmpty: false,
                        workflow,
                        copyPaste: expect.objectContaining({ dummy: null })
                    });
                });

                it('pastes at given position', async () => {
                    await startPaste({ position: { x: 100, y: 100 } });

                    expect(pastePartsAtMock).not.toHaveBeenCalled();
                    
                    expect(pasteWorkflowParts).toHaveBeenCalledWith({
                        projectId: 'my project',
                        workflowId: 'root',
                        content: 'parts',
                        position: { x: 100, y: 100 }
                    });
                });

                it('stores pastes boundary', async () => {
                    await startPaste();

                    expect(store.state.workflow.copyPaste).toStrictEqual({
                        dummy: null,
                        lastPasteBounds: {
                            left: 5,
                            top: 5,
                            width: 100,
                            height: 100
                        }
                    });
                });

                it('calls paste API function', async () => {
                    await startPaste();

                    expect(pasteWorkflowParts).toHaveBeenCalledWith({
                        projectId: 'my project',
                        workflowId: 'root',
                        content: 'parts',
                        position: { x: 5, y: 5 }
                    });
                });

                it('calls after paste hook', async () => {
                    await startPaste();

                    expect(doAfterPasteMock).toHaveBeenCalled();
                });

                it('selects nodes afterwards', async () => {
                    await startPaste();

                    expect(store.state.selection.selectedNodes.foo).toBeFalsy();
                    expect(store.state.selection.selectedNodes.bar).toBe(true);
                });
            });
        });
    });
});
