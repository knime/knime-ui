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
                params: ['foo', 'root'],
                id: 0
            }));

            expect(result).toStrictEqual('dummy');
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

    describe('error handling', () => {
        beforeAll(() => {
            window.jsonrpc = jest.fn().mockReturnValue(JSON.stringify({
                jsonrpc: '2.0',
                error: 'There has been an error',
                id: -1
            }));
        });


        it('handles errors on loadWorkflow', async (done) => {
            try {
                await api.loadWorkflow({ projectId: 'foo', containerId: 'bar' });
                done(new Error('Expected error not thrown'));
            } catch (e) {
                let ok = e.message.includes('foo') && e.message.includes('bar');
                done(!ok);
            }
        });

        it('handles errors on fetchApplicationState', async (done) => {
            try {
                await api.fetchApplicationState();
                done(new Error('Error not thrown'));
            } catch (e) {
                let ok = e.message.includes('application state');
                done(!ok);
            }
        });
    });

});
