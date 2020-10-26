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
            await api.loadWorkflow({ projectId: 'foo' });

            expect(window.jsonrpc).toHaveBeenCalledWith(JSON.stringify({
                jsonrpc: '2.0',
                method: 'WorkflowService.getWorkflow',
                params: ['foo', 'root'],
                id: 0
            }));
        });

        it('passes the container ID', async () => {
            await api.loadWorkflow({ projectId: 'foo', containerId: 'bar' });

            expect(window.jsonrpc).toHaveBeenCalledWith(JSON.stringify({
                jsonrpc: '2.0',
                method: 'WorkflowService.getWorkflow',
                params: ['foo', 'bar'],
                id: 0
            }));

        });
    });

    it('fetchApplicationState calls jsonrpc', async () => {
        await api.fetchApplicationState();

        expect(window.jsonrpc).toHaveBeenCalledWith(JSON.stringify({
            jsonrpc: '2.0',
            method: 'ApplicationService.getState',
            params: [],
            id: 0
        }));

    });

});
