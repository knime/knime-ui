import * as api from '~/api';

describe('API', () => {
    beforeEach(() => {
        window.jsonrpc = jest.fn((req) => {
            const { method, params } = JSON.parse(req);  // eslint-disable-line no-unused-vars
            let response = { error: 'error' };

            if (method === 'WorkflowService.getWorkflow') {
                response = {
                    result: {
                        workflow: {
                            projectId: 'foo'
                        }
                    }
                };
            } else if (method === 'ApplicationService.getState') {
                response = {
                    result: {
                        activeWorkflows: [{
                            workflow: {
                                projectId: 'foo'
                            }
                        }],
                        openedWorkflows: [{
                            name: 'foo',
                            projectId: 'bar'
                        }]
                    }
                };
            }
            return JSON.stringify(response);
        });
    });

    it('loadWorkflow calls jsonrpc', async () => {
        const response = await api.loadWorkflow('foo');

        expect(window.jsonrpc).toHaveBeenCalledWith(JSON.stringify({
            jsonrpc: '2.0',
            method: 'WorkflowService.getWorkflow',
            params: ['foo', 'root'],
            id: 0
        }));

        expect(response).toStrictEqual({
            workflow: {
                projectId: 'foo'
            }
        });
    });

    it('fetchApplicationState calls jsonrpc', async () => {
        const response = await api.fetchApplicationState();

        expect(window.jsonrpc).toHaveBeenCalledWith(JSON.stringify({
            jsonrpc: '2.0',
            method: 'ApplicationService.getState',
            params: [],
            id: 0
        }));

        expect(response).toStrictEqual({
            activeWorkflows: [{
                workflow: {
                    projectId: 'foo'
                }
            }],
            openedWorkflows: [{
                name: 'foo',
                projectId: 'bar'
            }]
        });
    });

});
