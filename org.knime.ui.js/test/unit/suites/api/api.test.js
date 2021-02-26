import * as api from '~/api';

describe('API', () => {

    beforeAll(() => {
        window.jsonrpc = jest.fn().mockReturnValue(JSON.stringify({
            jsonrpc: '2.0',
            result: 'dummy',
            id: -1
        }));
    });

    describe('loadWorkflow', () => {
        it('calls jsonrpc', async () => {
            let result = await api.loadWorkflow({ projectId: 'foo' });

            expect(window.jsonrpc).toHaveBeenCalledWith(JSON.stringify({
                jsonrpc: '2.0',
                method: 'WorkflowService.getWorkflow',
                params: ['foo', 'root', true],
                id: 0
            }));

            expect(result).toStrictEqual('dummy');
        });

        it('passes the container ID', async () => {
            await api.loadWorkflow({ projectId: 'foo', workflowId: 'bar' });

            expect(window.jsonrpc).toHaveBeenCalledWith(JSON.stringify({
                jsonrpc: '2.0',
                method: 'WorkflowService.getWorkflow',
                params: ['foo', 'bar', true],
                id: 0
            }));

        });
    });

    describe('fetchApplicationState', () => {
        it('calls jsonrpc', async () => {
            await api.fetchApplicationState();

            expect(window.jsonrpc).toHaveBeenCalledWith(JSON.stringify({
                jsonrpc: '2.0',
                method: 'ApplicationService.getState',
                params: [],
                id: 0
            }));
        });
    });

    describe('loadTable', () => {
        it('calls jsonrpc', async () => {
            window.jsonrpc.mockReturnValueOnce(JSON.stringify({
                jsonrpc: '2.0',
                id: -1,
                result: JSON.stringify({
                    jsonrpc: '2.0',
                    result: 'dummy',
                    id: -2
                })
            }));
            let table = await api.loadTable({
                projectId: 'foo',
                nodeId: 'root:123',
                portIndex: 2,
                offset: 100,
                batchSize: 450
            });
            let expectedNestedRPC = '{"jsonrpc":"2.0","id":0,"method":"getTable","params":[100,450]}';
            expect(window.jsonrpc).toHaveBeenCalledWith(JSON.stringify({
                jsonrpc: '2.0',
                method: 'NodeService.doPortRpc',
                params: ['foo', 'root:123', 2, expectedNestedRPC],
                id: 0
            }));
            expect(table).toBe('dummy');
        });
    });

    describe('loadFlowVariables', () => {
        it('calls jsonrpc', async () => {
            window.jsonrpc.mockReturnValueOnce(JSON.stringify({
                jsonrpc: '2.0',
                id: -1,
                result: JSON.stringify({
                    jsonrpc: '2.0',
                    result: 'dummy',
                    id: -2
                })
            }));
            let flowVariables = await api.loadFlowVariables({
                projectId: 'foo',
                nodeId: 'root:123',
                portIndex: 2
            });
            let expectedNestedRPC = '{"jsonrpc":"2.0","id":0,"method":"getFlowVariables"}';
            expect(window.jsonrpc).toHaveBeenCalledWith(JSON.stringify({
                jsonrpc: '2.0',
                method: 'NodeService.doPortRpc',
                params: ['foo', 'root:123', 2, expectedNestedRPC],
                id: 0
            }));
            expect(flowVariables).toBe('dummy');
        });
    });

    it('executes nodes', async () => {
        await api.executeNodes({ projectId: '123', nodeIds: ['a', 'b', 'c'] });
        expect(window.jsonrpc).toHaveBeenCalledWith(JSON.stringify({
            jsonrpc: '2.0',
            method: 'NodeService.changeNodeStates',
            params: ['123', ['a', 'b', 'c'], 'execute'],
            id: 0
        }));
    });

    it('cancels nodes', async () => {
        await api.cancelNodeExecution({ projectId: '123', nodeIds: ['a', 'b', 'c'] });
        expect(window.jsonrpc).toHaveBeenCalledWith(JSON.stringify({
            jsonrpc: '2.0',
            method: 'NodeService.changeNodeStates',
            params: ['123', ['a', 'b', 'c'], 'cancel'],
            id: 0
        }));
    });

    it('resets nodes', async () => {
        await api.resetNodes({ projectId: '123', nodeIds: ['a', 'b', 'c'] });
        expect(window.jsonrpc).toHaveBeenCalledWith(JSON.stringify({
            jsonrpc: '2.0',
            method: 'NodeService.changeNodeStates',
            params: ['123', ['a', 'b', 'c'], 'reset'],
            id: 0
        }));
    });

    it('pauses node execution', async () => {
        await api.pauseNodeExecution({ projectId: '123', nodeIds: ['loop'] });
        expect(window.jsonrpc).toHaveBeenLastCalledWith(JSON.stringify({
            jsonrpc: '2.0',
            method: 'NodeService.changeLoopState',
            params: ['123', 'loop', 'pause'],
            id: 0
        }));
    });

    it('resumes node execution', async () => {
        await api.resumeNodeExecution({ projectId: '123', nodeIds: ['loop'] });
        expect(window.jsonrpc).toHaveBeenLastCalledWith(JSON.stringify({
            jsonrpc: '2.0',
            method: 'NodeService.changeLoopState',
            params: ['123', 'loop', 'resume'],
            id: 0
        }));
    });

    it('steps node execution', async () => {
        await api.stepNodeExecution({ projectId: '123', nodeIds: ['loop'] });
        expect(window.jsonrpc).toHaveBeenLastCalledWith(JSON.stringify({
            jsonrpc: '2.0',
            method: 'NodeService.changeLoopState',
            params: ['123', 'loop', 'step'],
            id: 0
        }));
    });

    it.each(['add', 'remove'])('%ss event listeners', async (type) => {
        await api[`${type}EventListener`]('foo', { bar: 1, baz: 2 });
        expect(window.jsonrpc).toHaveBeenCalledWith(JSON.stringify({
            jsonrpc: '2.0',
            method: `EventService.${type}EventListener`,
            params: [{ typeId: 'fooEventType', bar: 1, baz: 2 }],
            id: 0
        }));
    });

    describe('error handling', () => {
        beforeEach(() => {
            window.jsonrpc.mockReturnValueOnce(JSON.stringify({
                jsonrpc: '2.0',
                error: 'There has been an error',
                id: -1
            }));
        });

        it('handles errors on loadWorkflow', async (done) => {
            try {
                await api.loadWorkflow({ projectId: 'foo', workflowId: 'bar' });
                done(new Error('Expected error not thrown'));
            } catch (e) {
                expect(e.message).toContain('foo');
                expect(e.message).toContain('bar');
                done();
            }
        });

        it('handles errors on fetchApplicationState', async (done) => {
            try {
                await api.fetchApplicationState();
                done(new Error('Error not thrown'));
            } catch (e) {
                expect(e.message).toContain('application state');
                done();
            }
        });

        it('handles errors on loadTable', async (done) => {
            try {
                await api.loadTable({});
                done(new Error('Error not thrown'));
            } catch (e) {
                expect(e.message).toContain('Couldn\'t load table');
                done();
            }
        });

        it('handles errors on loadFlowVariables', async (done) => {
            try {
                await api.loadFlowVariables({});
                done(new Error('Error not thrown'));
            } catch (e) {
                expect(e.message).toContain('Couldn\'t load flow variables');
                done();
            }
        });

        it('handles nested errors on loadTable', async (done) => {
            window.jsonrpc.mockReset();
            window.jsonrpc.mockReturnValueOnce(JSON.stringify({
                jsonrpc: '2.0',
                id: -1,
                result: JSON.stringify({
                    jsonrpc: '2.0',
                    error: 'foo'
                })
            }));
            let portIndex = 2;
            let projectId = 'projectId';
            let nodeId = Math.random();
            try {
                await api.loadTable({ projectId, nodeId, portIndex });
                done(new Error('Error not thrown'));
            } catch (e) {
                expect(e.message).toBe(
                    `Couldn't load table data from port ${portIndex} of node "${nodeId}" in project ${projectId}`
                );
                done();
            }
        });

        it('handles errors on addEventListener', async (done) => {
            try {
                await api.addEventListener('foo');
                done(new Error('Error not thrown'));
            } catch (e) {
                expect(e.message).toContain('Couldn\'t register event "foo"');
                done();
            }
        });

        it('handles errors on removeEventListener', async (done) => {
            try {
                await api.removeEventListener('foo');
                done(new Error('Error not thrown'));
            } catch (e) {
                expect(e.message).toContain('Couldn\'t unregister event "foo"');
                done();
            }
        });

        it('handles errors on execution', async (done) => {
            try {
                await api.executeNodes({});
                done(new Error('Error not thrown'));
            } catch (e) {
                expect(e.message).toContain('Could not execute nodes');
                done();
            }
        });

        it('handles errors on cancellation', async (done) => {
            try {
                await api.cancelNodeExecution({});
                done(new Error('Error not thrown'));
            } catch (e) {
                expect(e.message).toContain('Could not cancel node execution');
                done();
            }
        });

        it('handles errors on reset', async (done) => {
            try {
                await api.resetNodes({});
                done(new Error('Error not thrown'));
            } catch (e) {
                expect(e.message).toContain('Could not reset nodes');
                done();
            }
        });
    });
});
