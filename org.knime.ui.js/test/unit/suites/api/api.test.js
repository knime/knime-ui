import * as api from '~/api';

describe('API', () => {
    beforeAll(() => {
        window.jsonrpc = jest.fn(() => (JSON.stringify({
            result: [{
                workflow: {
                    name: 'foo',
                    dummy: true
                }
            }]
        })));
    });

    it('calls jsonrpc', async () => {
        expect(await api.loadWorkflow('foo')).toStrictEqual({ id: 'foo', name: 'foo', dummy: true });
    });

});
