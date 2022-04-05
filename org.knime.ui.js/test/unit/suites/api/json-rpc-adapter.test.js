import rpc from '~/api/json-rpc-adapter';

describe('JSON-RPC adapter', () => {
    beforeEach(() => {
        window.jsonrpc = jest.fn();
        window.jsonrpc.mockReturnValue({
            jsonrpc: '2.0',
            result: 'dummy',
            id: 0
        });
    });

    it('calls window.jsonrpc', async () => {
        let result = await rpc('a', 'b', 'c');
        expect(window.jsonrpc).toHaveBeenCalledWith({
            jsonrpc: '2.0',
            method: 'a',
            params: ['b', 'c'],
            id: 0
        });
        expect(result).toBe('dummy');
    });

    it('handles errors during call', async () => {
        window.jsonrpc.mockImplementationOnce(() => {
            throw new Error('internal error');
        });

        await expect(rpc('a', 'b', 'c')).rejects.toThrow('Error calling JSON-RPC api "a", "["b","c"]": internal error');
    });

    it('handles error response', async () => {
        window.jsonrpc.mockReturnValueOnce({
            error: 'This id is not known'
        });

        await expect(rpc('a', 'b', 'c')).rejects.toThrow(
            'Error returned from JSON-RPC API ["a",["b","c"]]: "This id is not known"'
        );
    });

    it('handles missing result', async () => {
        window.jsonrpc.mockReturnValueOnce({
            id: 0
        });

        await expect(rpc('a', 'b', 'c')).rejects.toThrow('Invalid JSON-RPC response {"id":0}');
    });

    it('handles mixed messages', async () => {
        window.jsonrpc.mockReturnValueOnce({
            id: 0,
            result: 'everything is fine',
            error: 'nothing is fine'
        });

        await expect(rpc('a', 'b', 'c')).rejects.toThrow(
            'Error returned from JSON-RPC API ["a",["b","c"]]: "nothing is fine"'
        );
    });
});
