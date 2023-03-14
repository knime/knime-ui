import { expect, describe, beforeAll, beforeEach, afterAll, it, vi } from 'vitest';
/* eslint-disable max-lines */
/* eslint-disable consistent-return */
import * as api from '@api';
import { waitForPatch } from '@/util/event-syncer';

const origErrorLogger = window.consola.error;

vi.mock('@/util/event-syncer');

describe('API', () => {
    beforeEach(() => {
        window.jsonrpc = vi.fn().mockReturnValue({
            jsonrpc: '2.0',
            result: 'dummy',
            id: -1
        });
    });

    describe('application Service', () => {
        describe('fetchApplicationState', () => {
            it('calls jsonrpc', async () => {
                await api.fetchApplicationState();

                expect(window.jsonrpc).toHaveBeenCalledWith({
                    jsonrpc: '2.0',
                    method: 'ApplicationService.getState',
                    id: 0
                });
            });
        });


        describe('error handling', () => {
            beforeAll(() => {
                window.consola.error = vi.fn();
            });

            beforeEach(() => {
                window.jsonrpc.mockReturnValueOnce({
                    jsonrpc: '2.0',
                    error: 'There has been an error',
                    id: -1
                });
            });

            afterAll(() => {
                window.consola.error = origErrorLogger;
            });

            it('handles errors on fetchApplicationState', async () => {
                await expect(api.fetchApplicationState()).rejects.toThrow('Could not load application state');
            });
        });
    });

    describe('event Service', () => {
        it.each(['add', 'remove'])('%ss event listeners', async (type) => {
            const t = 'foo';
            const args = { bar: 1, baz: 2 };
            await api[`${type}EventListener`](t, args);
            expect(window.jsonrpc).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                method: `EventService.${type}EventListener`,
                params: {
                    eventType: {
                        typeId: `${t}EventType`,
                        ...args
                    }
                },
                id: 0
            });
        });

        describe('error handling', () => {
            beforeAll(() => {
                window.consola.error = vi.fn();
            });

            beforeEach(() => {
                window.jsonrpc.mockReturnValueOnce({
                    jsonrpc: '2.0',
                    error: 'There has been an error',
                    id: -1
                });
            });

            afterAll(() => {
                window.consola.error = origErrorLogger;
            });


            it('handles errors on addEventListener', async () => {
                await expect(api.addEventListener('foo'))
                    .rejects.toThrow('Couldn\'t register event "foo" with args {}');
            });

            it('handles errors on removeEventListener', async () => {
                await expect(api.removeEventListener('foo'))
                    .rejects.toThrow('Couldn\'t unregister event "foo" with args {}');
            });
        });
    });

    describe('node Repository Service', () => {
        describe('searchNodes', () => {
            it('calls jsonrpc', async () => {
                const params = {
                    tags: ['myTag'],
                    allTagsMatch: true,
                    offset: 0,
                    limit: 2,
                    fullTemplateInfo: true,
                    nodesPartition: 'NOT_IN_COLLECTION',
                    portTypeId: ''
                };
                const query = 'churn';
                await api.searchNodes({
                    query,
                    ...params
                });

                expect(window.jsonrpc).toHaveBeenCalledWith({
                    jsonrpc: '2.0',
                    method: 'NodeRepositoryService.searchNodes',
                    params: {
                        q: query,
                        ...params
                    },
                    id: 0
                });
            });

            it('calls jsonrpc without inCollection', async () => {
                const params = {
                    tags: ['myTag'],
                    allTagsMatch: true,
                    offset: 0,
                    limit: 2,
                    fullTemplateInfo: true,
                    portTypeId: ''
                };
                const query = 'churn';
                await api.searchNodes({
                    query,
                    ...params
                });

                expect(window.jsonrpc).toHaveBeenCalledWith({
                    jsonrpc: '2.0',
                    method: 'NodeRepositoryService.searchNodes',
                    params: {
                        q: query,
                        nodesPartition: 'ALL',
                        ...params
                    },
                    id: 0
                });
            });
                
            it('calls jsonrpc without portTypeId', async () => {
                const params = {
                    tags: ['myTag'],
                    allTagsMatch: true,
                    offset: 0,
                    limit: 2,
                    fullTemplateInfo: true,
                    nodesPartition: 'IN_COLLECTION'
                };
                const query = 'churn';
                await api.searchNodes({
                    query,
                    ...params
                });
    
                expect(window.jsonrpc).toHaveBeenCalledWith({
                    jsonrpc: '2.0',
                    method: 'NodeRepositoryService.searchNodes',
                    params: {
                        q: query,
                        portTypeId: null,
                        ...params
                    },
                    id: 0
                });
            });
        });

        describe('getNodesGroupedByTags', () => {
            it('calls jsonrpc', async () => {
                const params = {
                    numNodesPerTag: 6,
                    tagsOffset: 0,
                    tagsLimit: 2,
                    fullTemplateInfo: true
                };
                await api.getNodesGroupedByTags(params);

                expect(window.jsonrpc).toHaveBeenCalledWith({
                    jsonrpc: '2.0',
                    method: 'NodeRepositoryService.getNodesGroupedByTags',
                    params,
                    id: 0
                });
            });
        });

        describe('getNodeRecommendations', () => {
            it('calls jsonrpc', async () => {
                const params = {
                    projectId: 'project_id',
                    workflowId: 'workflow_id',
                    nodeId: 'node_id',
                    portIdx: 1,
                    nodesLimit: 6,
                    fullTemplateInfo: true
                };
                await api.getNodeRecommendations(params);

                expect(window.jsonrpc).toHaveBeenCalledWith({
                    jsonrpc: '2.0',
                    method: 'NodeRepositoryService.getNodeRecommendations',
                    params,
                    id: 0
                });
            });
        });

        describe('error handling', () => {
            beforeAll(() => {
                window.consola.error = vi.fn();
            });

            beforeEach(() => {
                window.jsonrpc.mockReturnValueOnce({
                    jsonrpc: '2.0',
                    error: 'There has been an error',
                    id: -1
                });
            });

            afterAll(() => {
                window.consola.error = origErrorLogger;
            });

            it('handles errors on searchNodes', async () => {
                try {
                    await api.searchNodes({
                        query: 'churn',
                        tags: ['myTag'],
                        allTagsMatch: true,
                        nodeOffset: 0,
                        nodeLimit: 2,
                        fullTemplateInfo: true
                    });
                    return new Error('Error not thrown');
                } catch (e) {
                    expect(e.message).toContain('churn');
                    expect(e.message).toContain('myTag');
                }
            });

            it('handles errors on getNodesGroupedByTag', async () => {
                try {
                    await api.getNodesGroupedByTags({
                        numNodesPerTag: 6,
                        tagsOffset: 0,
                        tagsLimit: 2,
                        fullTemplateInfo: true
                    });
                    return new Error('Error not thrown');
                } catch (e) {
                    expect(e.message).toContain('nodes grouped by tags');
                }
            });

            it('handles errors on getNodeRecommendations', async () => {
                try {
                    await api.getNodeRecommendations({
                        projectId: 'project_id',
                        workflowId: 'workflow_id',
                        nodeId: 'node_id',
                        portIdx: 1,
                        nodesLimit: 6,
                        fullTemplateInfo: true
                    });
                    return new Error('Error not thrown');
                } catch (e) {
                    expect(e.message).toContain('recommended nodes');
                }
            });
        });
    });

    describe('node Service', () => {
        it('executes nodes', async () => {
            const params = {
                projectId: '123',
                workflowId: '12',
                nodeIds: ['a', 'b'],
                action: 'node action'
            };
            await api.changeNodeState(params);
            expect(window.jsonrpc).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                method: 'NodeService.changeNodeStates',
                params,
                id: 0
            });
        });

        it('loop action', async () => {
            const params = {
                projectId: '123',
                workflowId: '12',
                nodeId: 'loopy node',
                action: 'loopy action'
            };
            await api.changeLoopState(params);
            expect(window.jsonrpc).toHaveBeenLastCalledWith({
                jsonrpc: '2.0',
                method: 'NodeService.changeLoopState',
                params,
                id: 0
            });
        });

        it('fetches node description', async () => {
            const nodeFactoryKey = {
                className: 'test',
                settings: 'settings1'
            };
            await api.getNodeDescription(nodeFactoryKey);
            expect(window.jsonrpc).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                method: 'NodeService.getNodeDescription',
                params: {
                    nodeFactoryKey
                },
                id: 0
            });
        });

        it('fetch port view info', async () => {
            const params = {
                projectId: 'workflow',
                workflowId: 'root:1',
                nodeId: 'root:1:2',
                portIdx: 10
            };
            await api.getPortView(params);

            expect(window.jsonrpc).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                method: 'PortService.getPortView',
                params,
                id: 0
            });
        });

        it('call port data service', async () => {
            const params = {
                projectId: 'workflow',
                workflowId: 'root:1',
                nodeId: 'root:1:2',
                portIdx: 10,
                serviceType: 'data'
            };
            const request = 'request';
            await api.callPortDataService({
                request,
                ...params
            });

            expect(window.jsonrpc).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                method: 'PortService.callPortDataService',
                params: {
                    dataServiceRequest: request,
                    ...params
                },
                id: 0
            });
        });


        describe('error handling', () => {
            beforeAll(() => {
                window.consola.error = vi.fn();
            });

            beforeEach(() => {
                window.jsonrpc.mockReturnValueOnce({
                    jsonrpc: '2.0',
                    error: 'There has been an error',
                    id: -1
                });
            });

            afterAll(() => {
                window.consola.error = origErrorLogger;
            });

            it('handles errors for changeNodeState', async () => {
                try {
                    await api.changeNodeState({ action: 'do action' });
                    return new Error('Error not thrown');
                } catch (e) {
                    expect(e.message).toContain('Could not do action nodes');
                }
            });
        });
    });

    describe('workflow Service', () => {
        it('does not wait for patch if command does not have snapshot id', async () => {
            window.jsonrpc.mockReturnValueOnce({
                jsonrpc: '2.0',
                result: {},
                id: -1
            });

            await api.collapseToContainer({ projectId: '123', workflowId: '12' });

            expect(waitForPatch).not.toHaveBeenCalled();
            expect(window.jsonrpc).toHaveBeenCalled();
        });

        it('commands with snapshot id wait for patches with corresponding snapshot id to resolve', async () => {
            let isFirstPatchResolved = false;
            let isSecondPatchResolved = false;
            const firstSnapshotId = 1;
            const secondSnapshotId = 2;

            waitForPatch.mockImplementation(
                // eslint-disable-next-line max-nested-callbacks
                (params) => new Promise(resolve => setTimeout(() => {
                    if (params === firstSnapshotId) {
                        isFirstPatchResolved = true;
                    }

                    if (params === secondSnapshotId) {
                        isSecondPatchResolved = true;
                    }
                    resolve('patch complete');
                }, 100))
            );

            window.jsonrpc
                .mockReturnValueOnce({
                    jsonrpc: '2.0',
                    result: { snapshotId: firstSnapshotId },
                    id: -1
                })
                .mockReturnValueOnce({
                    jsonrpc: '2.0',
                    result: { snapshotId: secondSnapshotId },
                    id: -1
                });

            const firstCommandCall = api.collapseToContainer({ projectId: '123', workflowId: '12' });
            const secondCommandCall = api.collapseToContainer({ projectId: '123', workflowId: '12' });

            expect(isFirstPatchResolved).toBe(false);
            expect(isSecondPatchResolved).toBe(false);

            await firstCommandCall;

            expect(isFirstPatchResolved).toBe(true);
            expect(isSecondPatchResolved).toBe(false);

            await secondCommandCall;

            expect(isSecondPatchResolved).toBe(true);
            expect(window.jsonrpc).toHaveBeenCalledTimes(2);
        });

        it('deletes objects (empty)', async () => {
            const projectId = '123';
            const workflowId = '12';
            await api.deleteObjects({ projectId, workflowId });
            expect(window.jsonrpc).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                method: 'WorkflowService.executeWorkflowCommand',
                params: {
                    projectId,
                    workflowId,
                    workflowCommand: {
                        kind: 'delete',
                        nodeIds: [],
                        annotationIds: [],
                        connectionIds: []
                    }
                },
                id: 0
            });
        });

        it('delete objects (specified)', async () => {
            const projectId = '123';
            const workflowId = '12';
            const nodeIds = ['root:1'];
            const annotationIds = ['annotation1'];
            const connectionIds = ['root:1_1'];
            await api.deleteObjects({
                projectId,
                workflowId,
                nodeIds,
                annotationIds,
                connectionIds
            });
            expect(window.jsonrpc).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                method: 'WorkflowService.executeWorkflowCommand',
                params: {
                    projectId,
                    workflowId,
                    workflowCommand: {
                        kind: 'delete',
                        nodeIds,
                        annotationIds,
                        connectionIds
                    }
                },
                id: 0
            });
        });

        describe('loadWorkflow', () => {
            it('calls jsonrpc', async () => {
                const projectId = 'foo';
                let result = await api.loadWorkflow({ projectId });

                expect(window.jsonrpc).toHaveBeenCalledWith({
                    jsonrpc: '2.0',
                    method: 'WorkflowService.getWorkflow',
                    params: {
                        projectId,
                        workflowId: 'root',
                        includeInteractionInfo: true
                    },
                    id: 0
                });

                expect(result).toBe('dummy');
            });

            it('passes the container ID', async () => {
                const projectId = 'foo';
                const workflowId = 'bar';
                await api.loadWorkflow({ projectId, workflowId });

                expect(window.jsonrpc).toHaveBeenCalledWith({
                    jsonrpc: '2.0',
                    method: 'WorkflowService.getWorkflow',
                    params: {
                        projectId,
                        workflowId,
                        includeInteractionInfo: true
                    },
                    id: 0
                });
            });
        });

        describe('error handling', () => {
            beforeAll(() => {
                window.consola.error = vi.fn();
            });

            beforeEach(() => {
                window.jsonrpc.mockReturnValueOnce({
                    jsonrpc: '2.0',
                    error: 'There has been an error',
                    id: -1
                });
            });

            afterAll(() => {
                window.consola.error = origErrorLogger;
            });

            it('handles errors on loadWorkflow', async () => {
                try {
                    await api.loadWorkflow({ projectId: 'foo', workflowId: 'bar' });
                    return new Error('Expected error not thrown');
                } catch (e) {
                    expect(e.message).toContain('foo');
                    expect(e.message).toContain('bar');
                }
            });
        });
    });

    describe('space Service', () => {
        it('fetchWorkflowGroupContent', async () => {
            const params = {
                spaceProviderId: 'provider',
                spaceId: 'space',
                itemId: 'item'
            };
            let result = await api.fetchWorkflowGroupContent(params);

            expect(window.jsonrpc).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                method: 'SpaceService.listWorkflowGroup',
                params,
                id: 0
            });

            expect(result).toBe('dummy');
        });

        it('createWorkflow', async () => {
            const params = {
                spaceProviderId: 'provider',
                spaceId: 'space',
                itemId: 'item'
            };
            const workflowName = 'workflow-name';
            let result = await api.createWorkflow({
                workflowName,
                ...params
            });

            expect(window.jsonrpc).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                method: 'SpaceService.createWorkflow',
                params: {
                    itemName: workflowName,
                    ...params
                },
                id: 0
            });

            expect(result).toBe('dummy');
        });

        it('createFolder', async () => {
            const params = {
                spaceProviderId: 'provider',
                spaceId: 'space',
                itemId: 'item'
            };
            let result = await api.createFolder(params);

            expect(window.jsonrpc).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                method: 'SpaceService.createWorkflowGroup',
                params,
                id: 0
            });

            expect(result).toBe('dummy');
        });

        it('fetchSpaceProvider', async () => {
            const params = { spaceProviderId: 'provider' };
            await api.fetchSpaceProvider(params);

            expect(window.jsonrpc).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                method: 'SpaceService.getSpaceProvider',
                params,
                id: 0
            });
        });

        it('renameItem', async () => {
            const params = {
                spaceProviderId: 'provider',
                spaceId: 'space',
                itemId: 'item'
            };
            const newName = 'new name';
            let result = await api.renameItem({
                newName,
                ...params
            });

            expect(window.jsonrpc).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                method: 'SpaceService.renameItem',
                params: {
                    itemName: newName,
                    ...params
                },
                id: 0
            });

            expect(result).toBe('dummy');
        });

        it('deleteItems', async () => {
            const params = {
                spaceProviderId: 'provider',
                spaceId: 'space',
                itemIds: ['item1', 'item2']
            };
            await api.deleteItems(params);

            expect(window.jsonrpc).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                method: 'SpaceService.deleteItems',
                params,
                id: 0
            });
        });

        it('moveItems', async () => {
            const params = {
                spaceProviderId: 'local',
                spaceId: 'local',
                itemIds: ['id1', 'id2'],
                destWorkflowGroupItemId: 'group1'
            };
            const collisionStrategy = 'NOOP';
            await api.moveItems({
                collisionStrategy,
                ...params
            });

            expect(window.jsonrpc).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                method: 'SpaceService.moveItems',
                params: {
                    collisionHandling: collisionStrategy,
                    ...params
                },
                id: 0
            });
        });
    });
});
