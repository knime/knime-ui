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
            let result = await api.loadWorkflow('foo');

            expect(window.jsonrpc).toHaveBeenCalledWith(JSON.stringify({
                jsonrpc: '2.0',
                method: 'WorkflowService.getWorkflow',
                params: ['foo', 'root', true],
                id: 0
            }));

            expect(result).toStrictEqual('dummy');
        });

        it('passes the container ID', async () => {
            await api.loadWorkflow('foo', 'bar');

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

    describe('getTable', () => {
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
            let table = await api.getTable({
                projectId: 'foo',
                nodeId: 'root:123',
                portIndex: 2
            });
            let expectedNestedRPC = '{"jsonrpc":"2.0","id":0,"method":"getTable","params":[0,400]}';
            expect(window.jsonrpc).toHaveBeenCalledWith(JSON.stringify({
                jsonrpc: '2.0',
                method: 'NodeService.doPortRpc',
                params: ['foo', 'root:123', 2, expectedNestedRPC],
                id: 0
            }));
            expect(table).toBe('dummy');
        });
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
                await api.loadWorkflow('foo', 'bar');
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

        it('handles errors on getTable', async (done) => {
            try {
                await api.getTable({});
                done(new Error('Error not thrown'));
            } catch (e) {
                expect(e.message).toContain('Couldn\'t load table');
                done();
            }
        });

        it('handles nested errors on getTable', async (done) => {
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
                await api.getTable({ projectId, nodeId, portIndex });
                done(new Error('Error not thrown'));
            } catch (e) {
                expect(e.message).toBe(
                    `Couldn't load table data from port ${portIndex} of node "${nodeId}" in project ${projectId}`
                );
                done();
            }
        });
    });
});
