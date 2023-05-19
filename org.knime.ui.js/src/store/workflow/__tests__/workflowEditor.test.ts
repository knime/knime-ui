/* eslint-disable max-lines */
// eslint-disable-next-line object-curly-newline
import { expect, describe, afterEach, it, vi, type MockedFunction } from 'vitest';
import * as Vue from 'vue';

import { deepMocked, mockVuexStore } from '@/test/utils';
import { API } from '@api';
import { pastePartsAt } from '@/util/pasteToWorkflow';
import { Annotation, ReorderWorkflowAnnotationsCommand } from '@/api/gateway-api/generated-api';
import * as $colors from '@/style/colors.mjs';

vi.mock('@/util/pasteToWorkflow');

const mockedAPI = deepMocked(API);
const mockedPastePartsAt = pastePartsAt as MockedFunction<typeof pastePartsAt>;

describe('workflow store: Editing', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    const loadStore = async () => {
        const store = mockVuexStore({
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

        return { store };
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

            const node = store.state.workflow.activeWorkflow.nodes['root:1'];
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

            const node = store.state.workflow.activeWorkflow.nodes['root:1'];
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

        it('sets the id of the node thats label is being edited', async () => {
            const { store } = await loadStore();
            store.commit('workflow/setLabelEditorNodeId', 'root:1');

            expect(store.state.workflow.labelEditorNodeId).toBe('root:1');
        });
    });

    describe('actions', () => {
        describe('add node', () => {
            const setupStoreWithWorkflow = async () => {
                mockedAPI.workflowCommand.AddNode.mockImplementation(() => ({ newNodeId: 'new-mock-node' }));
                const loadStoreResponse = await loadStore();

                loadStoreResponse.store.commit('workflow/setActiveWorkflow', {
                    projectId: 'bar',
                    info: { containerId: 'baz' },
                    nodes: {
                        'root:1': { id: 'root:1', position: { x: 0, y: 0 } }
                    }
                });
                return { ...loadStoreResponse };
            };

            it('should adjust the position of the node to grid positions', async () => {
                const { store } = await setupStoreWithWorkflow();

                store.dispatch('workflow/addNode', { position: { x: 7, y: 31 }, nodeFactory: 'factory' });

                expect(mockedAPI.workflowCommand.AddNode).toHaveBeenCalledWith({
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
            const { store } = await loadStore();

            store.commit('workflow/setActiveWorkflow', { projectId: 'foo', info: { containerId: 'root' } });
            const payload = { nodeId: 'node x', side: 'input', typeId: 'porty', portGroup: 'group' };
            store.dispatch(
                `workflow/addNodePort`,
                payload
            );

            expect(mockedAPI.workflowCommand.AddPort).toHaveBeenCalledWith({
                projectId: 'foo',
                workflowId: 'root',
                nodeId: payload.nodeId,
                side: payload.side,
                portGroup: payload.portGroup,
                portTypeId: payload.typeId
            });
        });

        it('can remove Node Ports', async () => {
            const { store } = await loadStore();

            const payload = {
                nodeId: 'node x',
                side: 'input',
                index: 1,
                portGroup: 'group'
            };
            store.commit('workflow/setActiveWorkflow', { projectId: 'foo', info: { containerId: 'root' } });
            store.dispatch(`workflow/removeNodePort`, payload);

            expect(mockedAPI.workflowCommand.RemovePort).toHaveBeenCalledWith({
                nodeId: payload.nodeId,
                side: payload.side,
                portGroup: payload.portGroup,
                portIndex: payload.index,
                projectId: 'foo',
                workflowId: 'root'
            });
        });

        it('moves nodes and annotations', async () => {
            const { store } = await loadStore();
            store.commit('workflow/setActiveWorkflow', {
                projectId: 'bar',
                nodes: {
                    foo: { bla: 1, position: { x: 0, y: 0 } },
                    bar: { qux: 2, position: { x: 50, y: 50 } }
                },
                workflowAnnotations: [
                    { id: 'id1', bounds: { x: 10, y: 10, width: 10, height: 10 } },
                    { id: 'id2', bounds: { x: 20, y: 20, width: 20, height: 20 } }
                ]
            });
            store.dispatch('selection/selectAllObjects');
            await Vue.nextTick();

            store.commit('workflow/setMovePreview', { deltaX: 50, deltaY: 50 });
            expect(store.state.workflow.movePreviewDelta).toStrictEqual({ x: 50, y: 50 });
        });

        it('moves nodes outline', async () => {
            const { store } = await loadStore();
            const nodesArray = {};
            for (let i = 0; i < 11; i++) {
                const name = `node-${i}`;
                nodesArray[name] = { position: { x: 0, y: 0 }, id: `node-${i}` };
            }
            store.commit('workflow/setActiveWorkflow', {
                projectId: 'bar',
                nodes: nodesArray,
                workflowAnnotations: []
            });
            store.dispatch('selection/selectAllObjects');
            await Vue.nextTick();
            store.commit('workflow/setMovePreview', { deltaX: 50, deltaY: 50 });

            expect(store.state.workflow.movePreviewDelta).toStrictEqual({ x: 50, y: 50 });
        });

        it('moves subset of node outlines', async () => {
            const { store } = await loadStore();
            const nodesArray: Record<string, { id: string, position: any }> = {};
            for (let i = 0; i < 21; i++) {
                const name = `node-${i}`;
                nodesArray[name] = { position: { x: 0, y: 0 }, id: name };
            }
            store.commit('workflow/setActiveWorkflow', {
                projectId: 'bar',
                nodes: nodesArray
            });
            await Vue.nextTick();
            // select every even node
            Object.values(nodesArray).forEach((node, index) => {
                // eslint-disable-next-line vitest/no-conditional-tests
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
        ])('saves position after move end for %s nodes and annotations', async (amount) => {
            const { store } = await loadStore();
            const nodesArray: Record<string, { id: string, position: any }> = {};
            for (let i = 0; i < amount; i++) {
                const name = `node-${i}`;
                nodesArray[name] = { position: { x: 0, y: 0 }, id: name };
            }
            const annotationsArray: Array< {id: string, bounds: any}> = [];
            for (let i = 0; i < amount; i++) {
                const name = `annotation-${i}`;
                annotationsArray.push({ bounds: { x: 10, y: 10, width: 10, height: 10 }, id: name });
            }

            store.commit('workflow/setActiveWorkflow', {
                projectId: 'foo',
                nodes: nodesArray,
                info: {
                    containerId: 'test'
                },
                workflowAnnotations: annotationsArray
            });
            await Vue.nextTick();
            const nodeIds = [];
            const annotationIds = [];
            Object.values(nodesArray).forEach((node) => {
                store.dispatch('selection/selectNode', node.id);
                nodeIds.push(node.id);
            });
            Object.values(annotationsArray).forEach((annotation) => {
                store.dispatch('selection/selectAnnotation', annotation.id);
                annotationIds.push(annotation.id);
            });

            store.commit('workflow/setMovePreview', { deltaX: 50, deltaY: 50 });
            await store.dispatch('workflow/moveObjects');

            expect(mockedAPI.workflowCommand.Translate).toHaveBeenNthCalledWith(1, {
                projectId: 'foo',
                nodeIds,
                workflowId: 'test',
                translation: { x: 50, y: 50 },
                annotationIds
            });
        });

        it('skips moving objects if translation is 0', async () => {
            const { store } = await loadStore();

            store.commit('workflow/setIsDragging', true);
            store.commit('workflow/setMovePreview', { deltaX: 0, deltaY: 0 });
            store.commit('workflow/setActiveWorkflow', {
                projectId: 'foo',
                nodes: {},
                info: {
                    containerId: 'test'
                },
                workflowAnnotations: []
            });

            await store.dispatch('workflow/moveObjects');

            expect(store.state.workflow.isDragging).toBe(false);
            expect(mockedAPI.workflowCommand.Translate).not.toHaveBeenCalled();
        });

        it.each([
            [1],
            [20]
        ])('deletes %s objects', async (amount) => {
            const { store } = await loadStore();
            const nodesArray = {};
            const connectionsArray = {};
            const annotationsArray = [];
            const nodeIds = [];
            const connectionIds = [];
            const annotationIds = [];
            for (let i = 0; i < amount / 2; i++) {
                const id = `node-${i}`;
                nodesArray[id] = { id, allowedActions: { canDelete: true } };
                store.dispatch('selection/selectNode', id);
                nodeIds.push(id);
            }
            for (let i = 0; i < amount / 2; i++) {
                const id = `connection-${i}`;
                connectionsArray[id] = { id, allowedActions: { canDelete: true } };
                store.dispatch('selection/selectConnection', id);
                connectionIds.push(id);
            }
            for (let i = 0; i < amount / 2; i++) {
                const id = `annotation-${i}`;
                annotationsArray[i] = { id };
                store.dispatch('selection/selectAnnotation', id);
                annotationIds.push(id);
            }

            store.commit('workflow/setActiveWorkflow', {
                nodes: nodesArray,
                connections: connectionsArray,
                workflowAnnotations: annotationsArray,
                projectId: 'foo',
                info: {
                    containerId: 'test'
                }
            });
            await Vue.nextTick();
            store.dispatch('workflow/deleteSelectedObjects');
            expect(mockedAPI.workflowCommand.Delete).toHaveBeenNthCalledWith(1, {
                projectId: 'foo',
                workflowId: 'test',
                nodeIds,
                connectionIds,
                annotationIds
            });
        });

        describe('tries to delete objects that cannot be deleted', () => {
            vi.spyOn(window, 'alert').mockImplementation(() => { });

            const nodeName = `node-1`;
            const connectorName = `connection-1`;
            const nodesArray = {};
            nodesArray[nodeName] = { id: nodeName, allowedActions: { canDelete: false } };
            const connectionsArray = {};
            connectionsArray[connectorName] = { id: connectorName, allowedActions: { canDelete: false } };
            const annotationsArray = [];

            const setupStoreWithWorkflow = async () => {
                const loadStoreResponse = await loadStore();
                loadStoreResponse.store.commit('workflow/setActiveWorkflow', {
                    nodes: nodesArray,
                    connections: connectionsArray,
                    workflowAnnotations: annotationsArray,
                    projectId: 'foo',
                    info: {
                        containerId: 'test'
                    }
                });
                return loadStoreResponse;
            };

            it('nodes', async () => {
                const { store } = await setupStoreWithWorkflow();

                store.dispatch('selection/selectNode', nodesArray[nodeName].id);

                await Vue.nextTick();
                store.dispatch('workflow/deleteSelectedObjects');
                expect(window.alert).toHaveBeenCalledWith(
                    `The following nodes can’t be deleted: [node-1]`
                );
            });

            it('connections', async () => {
                const { store } = await setupStoreWithWorkflow();

                store.dispatch('selection/selectConnection', connectionsArray[connectorName].id);

                await Vue.nextTick();
                store.dispatch('workflow/deleteSelectedObjects');
                expect(window.alert).toHaveBeenCalledWith(
                    `The following connections can’t be deleted: [connection-1]`
                );
            });

            it('nodes and connections', async () => {
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
            const { store } = await loadStore();
            store.commit('workflow/setActiveWorkflow', { projectId: 'foo', info: { containerId: 'root' } });

            store.dispatch('workflow/connectNodes', {
                sourceNode: 'source:1',
                sourcePort: 0,
                destNode: 'dest:1',
                destPort: 1
            });

            expect(mockedAPI.workflowCommand.Connect).toHaveBeenCalledWith({
                projectId: 'foo',
                workflowId: 'root',
                sourceNodeId: 'source:1',
                sourcePortIdx: 0,
                destinationNodeId: 'dest:1',
                destinationPortIdx: 1
            });
        });

        it('transforms annotations', async () => {
            const { store } = await loadStore();
            store.commit('workflow/setActiveWorkflow', { projectId: 'foo', info: { containerId: 'root' } });

            const bounds = { x: 1, y: 2, width: 3, height: 4 };
            const annotationId = 'mock-annotation-id';
            store.dispatch('workflow/transformWorkflowAnnotation', {
                bounds,
                annotationId
            });

            expect(mockedAPI.workflowCommand.TransformWorkflowAnnotation).toHaveBeenCalledWith({
                projectId: 'foo',
                workflowId: 'root',
                bounds,
                annotationId
            });
        });

        it('should add annotation', async () => {
            mockedAPI.workflowCommand.AddWorkflowAnnotation.mockResolvedValueOnce({
                newAnnotationId: 'mock-annotation2'
            });

            const { store } = await loadStore();

            const mockAnnotation1 = { id: 'mock-annotation1' };
            store.commit('workflow/setActiveWorkflow', {
                workflowAnnotations: [mockAnnotation1],
                projectId: 'foo',
                info: {
                    containerId: 'root'
                }
            });
            await store.dispatch('selection/selectAnnotation', mockAnnotation1.id);

            const bounds = { x: 10, y: 10, width: 80, height: 80 };
            await store.dispatch('workflow/addWorkflowAnnotation', { bounds });

            expect(mockedAPI.workflowCommand.AddWorkflowAnnotation).toHaveBeenCalledWith({
                projectId: 'foo',
                workflowId: 'root',
                bounds,
                borderColor: $colors.defaultAnnotationBorderColor
            });

            expect(store.state.selection.selectedAnnotations).toEqual({ 'mock-annotation2': true });
            expect(store.state.workflow.editableAnnotationId).toBe('mock-annotation2');
        });

        it.each([
            [ReorderWorkflowAnnotationsCommand.ActionEnum.BringToFront],
            [ReorderWorkflowAnnotationsCommand.ActionEnum.BringForward],
            [ReorderWorkflowAnnotationsCommand.ActionEnum.SendBackward],
            [ReorderWorkflowAnnotationsCommand.ActionEnum.SendToBack]
        ])('reorders annotations (z-index)', async (action) => {
            const { store } = await loadStore();

            const mockAnnotation1 = { id: 'mock-annotation1' };
            const mockAnnotation2 = { id: 'mock-annotation2' };
            store.commit('workflow/setActiveWorkflow', {
                workflowAnnotations: [mockAnnotation1, mockAnnotation2],
                projectId: 'foo',
                info: {
                    containerId: 'root'
                }
            });
            await store.dispatch('selection/selectAnnotation', mockAnnotation1.id);
            await store.dispatch('selection/selectAnnotation', mockAnnotation2.id);

            store.dispatch('workflow/reorderWorkflowAnnotation', { action });

            expect(mockedAPI.workflowCommand.ReorderWorkflowAnnotations).toHaveBeenCalledWith({
                projectId: 'foo',
                workflowId: 'root',
                action,
                annotationIds: [mockAnnotation1.id, mockAnnotation2.id]
            });
        });

        describe('update annotation', () => {
            it('success', async () => {
                const { store } = await loadStore();

                const annotationId = 'mock-annotation-id';
                store.commit('workflow/setActiveWorkflow', {
                    projectId: 'foo',
                    info: { containerId: 'root' },
                    workflowAnnotations: [
                        {
                            id: annotationId,
                            text: 'legacy plain text',
                            contentType: Annotation.ContentTypeEnum.Plain,
                            borderColor: '#000000'
                        }
                    ]
                });

                const newText = '<p>new annotation text</p>';

                store.dispatch('workflow/updateAnnotation', {
                    text: '<p>new annotation text</p>',
                    annotationId,
                    borderColor: '#123456'
                });

                expect(mockedAPI.workflowCommand.UpdateWorkflowAnnotation).toHaveBeenCalledWith({
                    projectId: 'foo',
                    workflowId: 'root',
                    text: newText,
                    annotationId,
                    borderColor: '#123456'
                });

                const updatedAnnotation = store.state.workflow.activeWorkflow.workflowAnnotations.find(
                    annotation => annotation.id === annotationId
                );
                expect(updatedAnnotation.text).toEqual(newText);
                expect(updatedAnnotation.contentType).toEqual(Annotation.ContentTypeEnum.Html);
            });


            it('failure', async () => {
                const { store } = await loadStore();
                mockedAPI.workflowCommand.UpdateWorkflowAnnotation.mockRejectedValueOnce(new Error('random error'));

                const annotationId = 'mock-annotation-id';
                store.commit('workflow/setActiveWorkflow', {
                    projectId: 'foo',
                    info: { containerId: 'root' },
                    workflowAnnotations: [
                        {
                            id: annotationId,
                            text: 'legacy plain text',
                            contentType: Annotation.ContentTypeEnum.Plain,
                            borderColor: '#000000'
                        }
                    ]
                });

                await expect(() => store.dispatch('workflow/updateAnnotation', {
                    text: '<p>new annotation text</p>',
                    annotationId,
                    borderColor: '#123456'
                })).rejects.toThrowError('random error');

                const updatedAnnotation = store.state.workflow.activeWorkflow.workflowAnnotations.find(
                    annotation => annotation.id === annotationId
                );

                expect(updatedAnnotation.text).toBe('legacy plain text');
                expect(updatedAnnotation.borderColor).toBe('#000000');
                expect(updatedAnnotation.contentType).toEqual(Annotation.ContentTypeEnum.Plain);
            });
        });

        describe('collapse', () => {
            const loadStoreWithNodes = async () => {
                const result = await loadStore();
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
                    },
                    workflowAnnotations: [
                        { id: 'root:2_1', text: 'Test' },
                        { id: 'root:2_2', text: 'Test1' }
                    ]
                });
                return result;
            };

            it('collapses objects to a container', async () => {
                mockedAPI.workflowCommand.Collapse.mockImplementation(() => ({ newNodeId: '' }));
                const { store } = await loadStoreWithNodes();
                store.dispatch('selection/selectAllObjects');

                store.dispatch('workflow/collapseToContainer', {
                    containerType: 'metanode'
                });

                expect(mockedAPI.workflowCommand.Collapse).toHaveBeenCalledWith({
                    projectId: 'bar',
                    workflowId: 'root',
                    nodeIds: ['foo', 'bar'],
                    containerType: 'metanode',
                    annotationIds: ['root:2_1', 'root:2_2']
                });
            });

            it('selects the new container after collapsing nodes', async () => {
                const newNodeId = 'new-container';
                mockedAPI.workflowCommand.Collapse.mockImplementation(() => ({ newNodeId }));
                const { store } = await loadStoreWithNodes();
                store.dispatch('selection/selectAllObjects');

                await store.dispatch('workflow/collapseToContainer', {
                    containerType: 'metanode'
                });

                expect(store.state.selection.selectedNodes).toEqual({ [newNodeId]: true });
                expect(store.state.workflow.nameEditorNodeId).toBe(newNodeId);
            });

            it('does not select new container if user made a selection before collapse command finishes', async () => {
                const newNodeId = 'new-container';
                mockedAPI.workflowCommand.Collapse.mockImplementation(() => ({ newNodeId }));
                const { store } = await loadStoreWithNodes();
                store.dispatch('selection/selectAllObjects');

                const commandCall = store.dispatch('workflow/collapseToContainer', {
                    containerType: 'metanode'
                });

                store.dispatch('selection/selectNode', 'foo');

                await commandCall;

                expect(store.state.selection.selectedNodes).toStrictEqual({ foo: true });
                expect(store.state.workflow.nameEditorNodeId).toBeNull();
            });
        });

        describe('expand', () => {
            const loadStoreWithNodes = async () => {
                const result = await loadStore();
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
                    },
                    workflowAnnotations: []
                });

                return result;
            };

            it('expands a container node', async () => {
                mockedAPI.workflowCommand.Expand.mockImplementation(() => (
                    { expandedNodeIds: [], expandedAnnotationIds: [] }
                ));
                const { store } = await loadStoreWithNodes();
                store.dispatch('selection/selectNode', 'foo');

                store.dispatch('workflow/expandContainerNode');

                expect(mockedAPI.workflowCommand.Expand).toHaveBeenCalledWith({
                    projectId: 'bar',
                    workflowId: 'root',
                    nodeId: 'foo'
                });
            });

            it('selects the expanded nodes after the command finishes', async () => {
                const expandedNodeIds = ['foo', 'bar'];
                const expandedAnnotationIds = ['id1'];
                mockedAPI.workflowCommand.Expand.mockImplementation(() => ({ expandedNodeIds, expandedAnnotationIds }));

                const { store } = await loadStoreWithNodes();
                store.dispatch('selection/selectNode', 'foo');

                await store.dispatch('workflow/expandContainerNode');

                expect(store.state.selection.selectedNodes).toEqual({ foo: true, bar: true });
                expect(store.state.selection.selectedAnnotations).toEqual({ id1: true });
            });

            it('does not select the expanded nodes if user selected something before command ends', async () => {
                const expandedNodeIds = ['bar', 'baz'];

                mockedAPI.workflowCommand.Expand.mockImplementation(() => ({ expandedNodeIds }));
                const { store } = await loadStoreWithNodes();
                store.dispatch('selection/selectNode', 'foo');

                const commandCall = store.dispatch('workflow/expandContainerNode');

                await store.dispatch('selection/selectNode', 'barbaz');

                await commandCall;

                expect(store.state.selection.selectedNodes).toStrictEqual({ barbaz: true });
            });
        });

        describe('quickAddNodeMenu', () => {
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

        describe('portTypeMenu', () => {
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
                expect(store.state.workflow.portTypeMenu.previewPort).toBeNull();
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

        describe('copy, Cut and Paste', () => {
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

            it.each([
                ['Copy'],
                ['Cut']
            ])('executes <%s> command', async (command) => {
                const stringifiedPayload = JSON.stringify({
                    payloadIdentifier: 'p-id-1',
                    otherData: 'is here'
                });

                mockedAPI.workflowCommand[command].mockReturnValue({
                    content: stringifiedPayload
                });

                const clipboardMock = createClipboardMock();
                const { store } = await loadStore();

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
                    },
                    workflowAnnotations: [
                        { id: 'root:2_1', text: 'Test', bounds: { x: 10, y: 10, height: 10, width: 10 } },
                        { id: 'root:2_2', text: 'Test1', bounds: { x: 20, y: 20, height: 20, width: 20 } }
                    ]
                });

                store.dispatch('selection/selectAllObjects');
                await Vue.nextTick();
                await store.dispatch('workflow/copyOrCutWorkflowParts', { command: command.toLowerCase() });

                expect(mockedAPI.workflowCommand[command]).toHaveBeenCalledWith({
                    projectId: 'my project',
                    workflowId: 'root',
                    nodeIds: ['foo', 'bar'],
                    annotationIds: ['root:2_1', 'root:2_2']
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

            // eslint-disable-next-line vitest/max-nested-describe
            describe('executes paste command', () => {
                const setupStoreForPaste = async () => {
                    // register "pasteWorkflowParts" API function
                    mockedAPI.workflowCommand.Paste.mockReturnValue({
                        nodeIds: ['bar'],
                        annotationIds: ['root:2_1']
                    });

                    const { store } = await loadStore();

                    // set up workflow
                    const workflow = {
                        projectId: 'my project',
                        info: { containerId: 'root' },
                        nodes: { foo: { id: 'foo' }, bar: { id: 'bar' } },
                        workflowAnnotations: ['root:2_1', 'root:2_2']
                    };
                    store.commit('workflow/setActiveWorkflow', workflow);

                    // mock current clipboard content
                    const clipboardMock = createClipboardMock({
                        objectBounds: {
                            width: 100,
                            height: 100
                        },
                        data: 'parts'
                    });

                    // mock strategy result
                    const doAfterPasteMock = vi.fn();
                    mockedPastePartsAt.mockReturnValue({
                        position: { x: 5, y: 5 },
                        doAfterPaste: doAfterPasteMock
                    });

                    // mock previous copy paste state
                    store.commit('workflow/setCopyPaste', {
                        dummy: null
                    });

                    // Start pasting
                    const startPaste = (payload = {}) => store.dispatch(
                        'workflow/pasteWorkflowParts', payload
                    );

                    return {
                        startPaste,
                        clipboardMock,
                        workflow,
                        doAfterPasteMock,
                        store
                    };
                };

                it('calls partePartsAt', async () => {
                    const { startPaste, clipboardMock } = await setupStoreForPaste();
                    await startPaste();

                    expect(mockedPastePartsAt).toHaveBeenCalledWith({
                        visibleFrame: {
                            height: 1000,
                            width: 1000,
                            left: -500,
                            top: -500
                        },
                        clipboardContent: clipboardMock.getContent(),
                        isWorkflowEmpty: false,
                        dispatch: expect.any(Function)
                    });
                });

                it('pastes at given position', async () => {
                    const { startPaste } = await setupStoreForPaste();
                    await startPaste({ position: { x: 100, y: 100 } });

                    expect(mockedPastePartsAt).not.toHaveBeenCalled();

                    expect(mockedAPI.workflowCommand.Paste).toHaveBeenCalledWith({
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
                    const { startPaste } = await setupStoreForPaste();
                    await startPaste();

                    expect(mockedAPI.workflowCommand.Paste).toHaveBeenCalledWith({
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

        it('opens and closes node label editor', async () => {
            const { store } = await loadStore();
            await store.dispatch('workflow/openLabelEditor', 'root:1');
            expect(store.state.workflow.labelEditorNodeId).toBe('root:1');
            await store.dispatch('workflow/closeLabelEditor');
            expect(store.state.workflow.labelEditorNodeId).toBeNull();
        });
    });

    describe('getters', () => {
        it('returns if a node is connected', async () => {
            const { store } = await loadStore();
            store.commit('workflow/setActiveWorkflow', { connections: {
                'connector-1': { destNode: 'node1', sourceNode: 'node2' },
                'connector-2': { destNode: 'node2', sourceNode: 'node3' },
                'connector-3': { destNode: 'node3', sourceNode: 'node4' }
            } });
            expect(store.getters['workflow/isNodeConnected']('node1')).toBeTruthy();
            expect(store.getters['workflow/isNodeConnected']('node5')).toBeFalsy();
        });
    });
});
