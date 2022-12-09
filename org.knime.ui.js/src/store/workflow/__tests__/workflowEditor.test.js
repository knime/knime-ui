/* eslint-disable max-lines */
import Vue from 'vue';
import Vuex from 'vuex';
import { createLocalVue } from '@vue/test-utils';

import { mockVuexStore } from '@/test/test-utils';

import { wrapAPI } from '../workflowEditor';

describe('workflow store: Editing', () => {
    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    const loadStore = async ({ apiMocks = {} } = {}) => {
        const moveObjectsMock = jest.fn().mockReturnValue(Promise.resolve());
        const deleteObjectsMock = jest.fn().mockReturnValue(Promise.resolve());

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

        const pastePartsAtMock = jest.fn();
        jest.doMock('@/util/pasteToWorkflow', () => ({
            __esModule: true,
            pastePartsAt: pastePartsAtMock
        }));

        const store = mockVuexStore({
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

        return { store, moveObjectsMock, deleteObjectsMock, pastePartsAtMock };
    };

    describe('mutation', () => {
        it('shifts the position of a node', async () => {
            const { store } = await loadStore();
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

        it('resets the position of the outlint', async () => {
            const { store } = await loadStore();
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

        it('sets the preview of a portTypeMenu', async () => {
            const { store } = await loadStore();
            store.commit('workflow/setPortTypeMenuPreviewPort', { typeId: 'prev' });

            expect(store.state.workflow.portTypeMenu.previewPort).toStrictEqual({ typeId: 'prev' });
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

        describe('Add node', () => {
            const setupStoreWithWorkflow = async () => {
                const addNodeMock = jest.fn(() => ({ newNodeId: 'new-mock-node' }));
                const loadStoreResponse = await loadStore({ apiMocks: { addNode: addNodeMock } });

                loadStoreResponse.store.commit('workflow/setActiveWorkflow', {
                    projectId: 'bar',
                    info: { containerId: 'baz' },
                    nodes: {
                        'root:1': { id: 'root:1', position: { x: 0, y: 0 } }
                    }
                });
                return { ...loadStoreResponse, addNodeMock };
            };

            it('should adjust the position of the node to grid positions', async () => {
                const { store, addNodeMock } = await setupStoreWithWorkflow();

                store.dispatch('workflow/addNode', { position: { x: 7, y: 31 }, nodeFactory: 'factory' });

                expect(addNodeMock).toHaveBeenCalledWith({
                    projectId: store.state.workflow.activeWorkflow.projectId,
                    workflowId: store.state.workflow.activeWorkflow.info.containerId,
                    position: { x: 5, y: 30 },
                    nodeFactory: 'factory',
                    sourceNodeId: null,
                    sourcePortIdx: null
                });
            });

            it.each([
                // selectionMode, currentSelectedNodeIds, expectedNodeIds
                ['new-only', ['root:id'], ['new-mock-node']],
                ['add', ['root:id'], ['root:id', 'new-mock-node']],
                ['none', [], []]
            ])(
                'adjusts selection correctly after adding node',
                async (selectionMode, currentSelectedNodeIds, expectedNodeIds) => {
                    const { store } = await setupStoreWithWorkflow();
                    await store.dispatch('selection/selectNodes', currentSelectedNodeIds);

                    await store.dispatch('workflow/addNode', {
                        position: { x: 0, y: 0 },
                        nodeFactory: 'factory',
                        selectionMode
                    });

                    const expectedSelection = expectedNodeIds.reduce((acc, nodeId) => ({
                        ...acc,
                        [nodeId]: true
                    }), {});

                    expect(store.state.selection.selectedNodes).toEqual(expectedSelection);
                }
            );
        });

        it('can add Node Ports', async () => {
            let apiMocks = { addNodePort: jest.fn() };
            const { store } = await loadStore({ apiMocks });

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
            const { store } = await loadStore({ apiMocks });

            const payload = { nodeId: 'node x', side: 'input', typeId: 'porty', portIndex: 1, portGroup: 'group' };
            store.commit('workflow/setActiveWorkflow', { projectId: 'foo', info: { containerId: 'root' } });
            store.dispatch(`workflow/removeNodePort`, payload);

            expect(apiMocks.removeNodePort).toHaveBeenCalledWith(
                { ...payload, projectId: 'foo', workflowId: 'root' }
            );
        });

        it('moves actual nodes', async () => {
            const { store } = await loadStore();
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
            const { store } = await loadStore();
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
            const { store } = await loadStore();
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
            const { store, moveObjectsMock } = await loadStore();
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
            const { store, deleteObjectsMock } = await loadStore();
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

            const setupStoreWithWorkflow = async () => {
                const loadStoreResponse = await loadStore();
                loadStoreResponse.store.commit('workflow/setActiveWorkflow', {
                    nodes: nodesArray,
                    connections: connectionsArray,
                    projectId: 'foo',
                    info: {
                        containerId: 'test'
                    }
                });
                return loadStoreResponse;
            };

            test('nodes', async () => {
                const { store } = await setupStoreWithWorkflow();

                store.dispatch('selection/selectNode', nodesArray[nodeName].id);

                await Vue.nextTick();
                store.dispatch('workflow/deleteSelectedObjects');
                expect(window.alert).toHaveBeenCalledWith(
                    `The following nodes can’t be deleted: [node-1]`
                );
            });

            test('connections', async () => {
                const { store } = await setupStoreWithWorkflow();

                store.dispatch('selection/selectConnection', connectionsArray[connectorName].id);

                await Vue.nextTick();
                store.dispatch('workflow/deleteSelectedObjects');
                expect(window.alert).toHaveBeenCalledWith(
                    `The following connections can’t be deleted: [connection-1]`
                );
            });

            test('nodes and connections', async () => {
                const { store } = await setupStoreWithWorkflow();

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
            const { store } = await loadStore({ apiMocks });
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
                const result = await loadStore({ apiMocks });
                result.store.commit('workflow/setActiveWorkflow', {
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
                return result;
            };

            it('collapses nodes to a container', async () => {
                let collapseToContainer = jest.fn(() => ({ newNodeId: '' }));
                let apiMocks = { collapseToContainer };
                const { store } = await loadStoreWithNodes({ apiMocks });
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
                const { store } = await loadStoreWithNodes({ apiMocks });
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
                const { store } = await loadStoreWithNodes({ apiMocks });
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
                const result = await loadStore({ apiMocks });
                result.store.commit('workflow/setActiveWorkflow', {
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

                return result;
            };

            it('expands a container node', async () => {
                let expandContainerNode = jest.fn(() => ({ expandedNodeIds: [] }));
                let apiMocks = { expandContainerNode };
                const { store } = await loadStoreWithNodes({ apiMocks });
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
                const { store } = await loadStoreWithNodes({ apiMocks });
                store.dispatch('selection/selectNode', 'foo');

                await store.dispatch('workflow/expandContainerNode');

                expect(store.state.selection.selectedNodes).toEqual({ foo: true, bar: true });
            });

            it('does not select the expanded nodes if user selected something before command ends', async () => {
                const expandedNodeIds = ['bar', 'baz'];

                let expandContainerNode = jest.fn(() => ({ expandedNodeIds }));
                let apiMocks = { expandContainerNode };
                const { store } = await loadStoreWithNodes({ apiMocks });
                store.dispatch('selection/selectNode', 'foo');

                const commandCall = store.dispatch('workflow/expandContainerNode');

                await store.dispatch('selection/selectNode', 'barbaz');

                await commandCall;

                expect(store.state.selection.selectedNodes).toStrictEqual({ barbaz: true });
            });
        });

        describe('QuickAddNodeMenu', () => {
            it('opens the quick add node menu', async () => {
                const { store } = await loadStore();
                expect(store.state.workflow.quickAddNodeMenu.isOpen).toBe(false);
                await store.dispatch(
                    'workflow/openQuickAddNodeMenu',
                    {
                        props: { someProp: 'val' },
                        events: { 'menu-close': () => {} }
                    }
                );
                expect(store.state.workflow.quickAddNodeMenu.isOpen).toBe(true);
                expect(store.state.workflow.quickAddNodeMenu.props).toStrictEqual({ someProp: 'val' });
                expect(store.state.workflow.quickAddNodeMenu.events).toMatchObject({ 'menu-close': expect.anything() });
            });

            it('closes the quick add node menu', async () => {
                const { store } = await loadStore();
                await store.dispatch('workflow/openQuickAddNodeMenu', {});
                expect(store.state.workflow.quickAddNodeMenu.isOpen).toBe(true);
                await store.dispatch('workflow/closeQuickAddNodeMenu');
                expect(store.state.workflow.quickAddNodeMenu.isOpen).toBe(false);
            });
        });

        describe('PortTypeMenu', () => {
            it('opens the port type menu', async () => {
                const { store } = await loadStore();
                expect(store.state.workflow.portTypeMenu.isOpen).toBe(false);
                await store.dispatch(
                    'workflow/openPortTypeMenu',
                    {
                        nodeId: 'node-id',
                        props: { side: 'out' },
                        startNodeId: 'start-node-id',
                        events: { 'menu-close': () => {} }
                    }
                );
                expect(store.state.workflow.portTypeMenu.isOpen).toBe(true);
                expect(store.state.workflow.portTypeMenu.nodeId).toBe('node-id');
                expect(store.state.workflow.portTypeMenu.startNodeId).toBe('start-node-id');
                expect(store.state.workflow.portTypeMenu.previewPort).toBe(null);
                expect(store.state.workflow.portTypeMenu.props).toStrictEqual({ side: 'out' });
                expect(store.state.workflow.portTypeMenu.events).toMatchObject({ 'menu-close': expect.anything() });
            });

            it('closes the port type menu', async () => {
                const { store } = await loadStore();
                await store.dispatch('workflow/openPortTypeMenu', {});
                expect(store.state.workflow.portTypeMenu.isOpen).toBe(true);
                await store.dispatch('workflow/closePortTypeMenu');
                expect(store.state.workflow.portTypeMenu.isOpen).toBe(false);
            });
        });

        describe('Copy, Cut and Paste', () => {
            const createClipboardMock = (initialContent = {}) => {
                const clipboardMock = (function (_initialContent) {
                    let clipboardContent = _initialContent;

                    return {
                        setContent(newContent) {
                            clipboardContent = newContent;
                        },
                        getContent() {
                            return clipboardContent;
                        }
                    };
                })(initialContent);

                Object.assign(navigator, {
                    clipboard: {
                        writeText: (text) => {
                            clipboardMock.setContent(JSON.parse(text));
                        },
                        readText: () => {
                            const content = clipboardMock.getContent();
                            return content ? JSON.stringify(content) : '';
                        }
                    }
                });

                return clipboardMock;
            };

            afterEach(() => {
                jest.clearAllMocks();
            });

            it.each([
                ['copy'],
                ['cut']
            ])('executes <%s> command', async (command) => {
                const stringifiedPayload = JSON.stringify({
                    payloadIdentifier: 'p-id-1',
                    otherData: 'is here'
                });

                const copyOrCutWorkflowParts = jest.fn().mockReturnValue({
                    content: stringifiedPayload
                });

                const clipboardMock = createClipboardMock();
                const { store } = await loadStore({ apiMocks: { copyOrCutWorkflowParts } });

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

                expect(clipboardMock.getContent()).toStrictEqual({
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
                const setupStoreForPaste = async () => {
                    // register "pasteWorkflowParts" API function
                    const pasteWorkflowParts = jest.fn().mockReturnValue({
                        nodeIds: ['bar']
                    });

                    const loadStoreResponse = await loadStore({
                        apiMocks: { pasteWorkflowParts }
                    });

                    // set up workflow
                    const workflow = {
                        projectId: 'my project',
                        info: { containerId: 'root' },
                        nodes: { foo: { id: 'foo' }, bar: { id: 'bar' } },
                        workflowAnnotations: []
                    };
                    loadStoreResponse.store.commit('workflow/setActiveWorkflow', workflow);

                    // mock current clipboard content
                    const clipboardMock = createClipboardMock({
                        objectBounds: {
                            width: 100,
                            height: 100
                        },
                        data: 'parts'
                    });

                    // mock strategy result
                    const doAfterPasteMock = jest.fn();
                    loadStoreResponse.pastePartsAtMock.mockReturnValue({
                        position: { x: 5, y: 5 },
                        doAfterPaste: doAfterPasteMock
                    });

                    // mock previous copy paste state
                    loadStoreResponse.store.commit('workflow/setCopyPaste', {
                        dummy: null
                    });

                    // Start pasting
                    const startPaste = (payload = {}) => loadStoreResponse.store.dispatch(
                        'workflow/pasteWorkflowParts', payload
                    );

                    return {
                        startPaste,
                        clipboardMock,
                        pasteWorkflowParts,
                        workflow,
                        doAfterPasteMock,
                        ...loadStoreResponse
                    };
                };

                it('calls partePartsAt', async () => {
                    const { pastePartsAtMock, workflow, startPaste, clipboardMock } = await setupStoreForPaste();
                    await startPaste();

                    expect(pastePartsAtMock).toHaveBeenCalledWith({
                        visibleFrame: {
                            height: 1000,
                            width: 1000,
                            left: -500,
                            top: -500
                        },
                        clipboardContent: clipboardMock.getContent(),
                        isWorkflowEmpty: false,
                        workflow,
                        copyPaste: expect.objectContaining({ dummy: null })
                    });
                });

                it('pastes at given position', async () => {
                    const { pastePartsAtMock, startPaste, pasteWorkflowParts } = await setupStoreForPaste();
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
                    const { store, startPaste } = await setupStoreForPaste();
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
                    const { pasteWorkflowParts, startPaste } = await setupStoreForPaste();
                    await startPaste();

                    expect(pasteWorkflowParts).toHaveBeenCalledWith({
                        projectId: 'my project',
                        workflowId: 'root',
                        content: 'parts',
                        position: { x: 5, y: 5 }
                    });
                });

                it('calls after paste hook', async () => {
                    const { startPaste, doAfterPasteMock } = await setupStoreForPaste();
                    await startPaste();

                    expect(doAfterPasteMock).toHaveBeenCalled();
                });

                it('selects nodes afterwards', async () => {
                    const { startPaste, store } = await setupStoreForPaste();
                    await startPaste();

                    expect(store.state.selection.selectedNodes.foo).toBeFalsy();
                    expect(store.state.selection.selectedNodes.bar).toBe(true);
                });
            });
        });
    });
});
