/* eslint-disable consistent-return */
import * as api from '~/api';
import { waitForPatch } from '~/util/event-syncer';

const origErrorLogger = window.consola.error;

jest.mock('~/util/event-syncer');

describe('API', () => {
    beforeEach(() => {
        window.jsonrpc = jest.fn().mockReturnValue({
            jsonrpc: '2.0',
            result: 'dummy',
            id: -1
        });
    });
    
    describe('Application Service', () => {
        describe('fetchApplicationState', () => {
            it('calls jsonrpc', async () => {
                await api.fetchApplicationState();

                expect(window.jsonrpc).toHaveBeenCalledWith({
                    jsonrpc: '2.0',
                    method: 'ApplicationService.getState',
                    params: [],
                    id: 0
                });
            });
        });


        describe('error handling', () => {
            beforeAll(() => {
                window.consola.error = jest.fn();
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

    describe('Event Service', () => {
        it.each(['add', 'remove'])('%ss event listeners', async (type) => {
            await api[`${type}EventListener`]('foo', { bar: 1, baz: 2 });
            expect(window.jsonrpc).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                method: `EventService.${type}EventListener`,
                params: [{ typeId: 'fooEventType', bar: 1, baz: 2 }],
                id: 0
            });
        });


        describe('error handling', () => {
            beforeAll(() => {
                window.consola.error = jest.fn();
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

    describe('Node Repository Service', () => {
        describe('searchNodes', () => {
            it('calls jsonrpc', async () => {
                await api.searchNodes({
                    query: 'churn',
                    tags: ['myTag'],
                    allTagsMatch: true,
                    nodeOffset: 0,
                    nodeLimit: 2,
                    fullTemplateInfo: true
                });

                expect(window.jsonrpc).toHaveBeenCalledWith({
                    jsonrpc: '2.0',
                    method: 'NodeRepositoryService.searchNodes',
                    params: ['churn', ['myTag'], true, 0, 2, true],
                    id: 0
                });
            });
        });

        describe('getNodesGroupedByTags', () => {
            it('calls jsonrpc', async () => {
                const NODES_LIMIT = 6;
                await api.getNodesGroupedByTags({
                    numNodesPerTag: NODES_LIMIT,
                    tagsOffset: 0,
                    tagsLimit: 2,
                    fullTemplateInfo: true
                });

                expect(window.jsonrpc).toHaveBeenCalledWith({
                    jsonrpc: '2.0',
                    method: 'NodeRepositoryService.getNodesGroupedByTags',
                    params: [NODES_LIMIT, 0, 2, true],
                    id: 0
                });
            });
        });

        describe('error handling', () => {
            beforeAll(() => {
                window.consola.error = jest.fn();
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
        });
    });

    describe('Node Service', () => {
        it('executes nodes', async () => {
            await api.changeNodeState({
                projectId: '123',
                workflowId: '12',
                nodeIds: ['a', 'b'],
                action: 'node action'
            });
            expect(window.jsonrpc).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                method: 'NodeService.changeNodeStates',
                params: ['123', '12', ['a', 'b'], 'node action'],
                id: 0
            });
        });

        it('loop action', async () => {
            await api.changeLoopState({
                projectId: '123',
                workflowId: '12',
                nodeId: 'loopy node',
                action: 'loopy action'
            });
            expect(window.jsonrpc).toHaveBeenLastCalledWith({
                jsonrpc: '2.0',
                method: 'NodeService.changeLoopState',
                params: ['123', '12', 'loopy node', 'loopy action'],
                id: 0
            });
        });

        it('fetches node description', async () => {
            await api.getNodeDescription({
                className: 'test',
                settings: 'settings1'
            });
            expect(window.jsonrpc).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                method: 'NodeService.getNodeDescription',
                params: [{
                    className: 'test',
                    settings: 'settings1'
                }],
                id: 0
            });
        });

        it('fetch port view info', async () => {
            await api.getPortView(
                'workflow',
                'root:1',
                'root:1:2',
                // eslint-disable-next-line no-magic-numbers
                10
            );
            expect(window.jsonrpc).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                method: 'NodeService.getPortView',
                params: [
                    'workflow',
                    'root:1',
                    'root:1:2',
                    // eslint-disable-next-line no-magic-numbers
                    10
                ],
                id: 0
            });
        });

        it('call port data service', async () => {
            await api.callPortDataService({
                projectId: 'workflow',
                workflowId: 'root:1',
                nodeId: 'root:1:2',
                portIndex: 10,
                serviceType: 'data',
                request: 'request'
            });
            expect(window.jsonrpc).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                method: 'NodeService.callPortDataService',
                params: [
                    'workflow',
                    'root:1',
                    'root:1:2',
                    // eslint-disable-next-line no-magic-numbers
                    10,
                    'data',
                    'request'
                ],
                id: 0
            });
        });


        describe('error handling', () => {
            beforeAll(() => {
                window.consola.error = jest.fn();
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

    describe('Workflow Service', () => {
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
            await api.deleteObjects({ projectId: '123', workflowId: '12' });
            expect(window.jsonrpc).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                method: 'WorkflowService.executeWorkflowCommand',
                params: ['123', '12', {
                    kind: 'delete',
                    nodeIds: [],
                    annotationIds: [],
                    connectionIds: []
                }],
                id: 0
            });
        });

        it('delete objects (specified)', async () => {
            await api.deleteObjects({
                projectId: '123',
                workflowId: '12',
                nodeIds: ['root:1'],
                annotationIds: ['annotation1'],
                connectionIds: ['root:1_1']
            });
            expect(window.jsonrpc).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                method: 'WorkflowService.executeWorkflowCommand',
                params: ['123', '12', {
                    kind: 'delete',
                    nodeIds: ['root:1'],
                    annotationIds: ['annotation1'],
                    connectionIds: ['root:1_1']
                }],
                id: 0
            });
        });

        describe('loadWorkflow', () => {
            it('calls jsonrpc', async () => {
                let result = await api.loadWorkflow({ projectId: 'foo' });

                expect(window.jsonrpc).toHaveBeenCalledWith({
                    jsonrpc: '2.0',
                    method: 'WorkflowService.getWorkflow',
                    params: ['foo', 'root', true],
                    id: 0
                });

                expect(result).toStrictEqual('dummy');
            });

            it('passes the container ID', async () => {
                await api.loadWorkflow({ projectId: 'foo', workflowId: 'bar' });

                expect(window.jsonrpc).toHaveBeenCalledWith({
                    jsonrpc: '2.0',
                    method: 'WorkflowService.getWorkflow',
                    params: ['foo', 'bar', true],
                    id: 0
                });
            });
        });

        describe('error handling', () => {
            beforeAll(() => {
                window.consola.error = jest.fn();
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

    describe('Port RPCs', () => {
        describe('loadTable', () => {
            it.skip('calls jsonrpc', async () => {
                window.jsonrpc.mockReturnValueOnce({
                    jsonrpc: '2.0',
                    id: -1,
                    result: {
                        jsonrpc: '2.0',
                        result: 'nested result',
                        id: -2
                    }
                });
                let table = await api.loadTable({
                    projectId: 'foo',
                    workflowId: 'root',
                    nodeId: 'root:123',
                    portIndex: 2,
                    offset: 100,
                    batchSize: 450
                });
                let expectedNestedRPC = '{"jsonrpc":"2.0","id":0,"method":"getTable","params":[100,450]}';
                expect(window.jsonrpc).toHaveBeenCalledWith({
                    jsonrpc: '2.0',
                    method: 'NodeService.callPortDataService',
                    params: ['foo', 'root', 'root:123', 2, expectedNestedRPC],
                    id: 0
                });
                expect(table).toBe('nested result');
            });
        });

        describe('error handling', () => {
            beforeAll(() => {
                window.consola.error = jest.fn();
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

            it('handles errors on loadTable', async () => {
                try {
                    await api.loadTable({});
                    return new Error('Error not thrown');
                } catch (e) {
                    expect(e.message).toContain('Couldn\'t load table');
                }
            });

            it('handles nested errors on loadTable', async () => {
                window.jsonrpc.mockReset();
                window.jsonrpc.mockReturnValueOnce({
                    jsonrpc: '2.0',
                    id: -1,
                    result: JSON.stringify({
                        jsonrpc: '2.0',
                        error: 'foo'
                    })
                });
                let portIndex = 2;
                let projectId = 'projectId';
                let nodeId = Math.random();

                try {
                    await api.loadTable({ projectId, nodeId, portIndex, batchSize: 400 });
                    return new Error('Error not thrown');
                } catch (e) {
                    expect(e.message).toBe(
                        `Couldn't load table data (start: 0, length: 400) from port` +
                        ` ${portIndex} of node "${nodeId}" in project ${projectId}`
                    );
                }
            });
        });
    });
});
