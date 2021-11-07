import rpc from '~/api/json-rpc-adapter';

describe('JSON-RPC adapter', () => {
    beforeEach(() => {
        window.jsonrpc = jest.fn();
        window.jsonrpc.mockReturnValue(JSON.stringify({
            jsonrpc: '2.0',
            result: 'dummy',
            id: 0
        }));
    });

    it('calls window.jsonrpc', async () => {
        let result = await rpc('a', 'b', 'c');
        expect(window.jsonrpc).toHaveBeenCalledWith(JSON.stringify({
            jsonrpc: '2.0',
            method: 'a',
            params: ['b', 'c'],
            id: 0
        }));
        expect(result).toBe('dummy');
    });

    it('handles errors during call', () => {
        window.jsonrpc.mockImplementationOnce(() => {
            throw new Error('internal error');
        });

        expect(() => rpc('a', 'b', 'c')).toThrow('Error calling JSON-RPC api "a", "["b","c"]": internal error');
    });

    it('handles syntactically invalid response', () => {
        window.jsonrpc.mockReturnValueOnce(`${JSON.stringify({
            this: 'is'
        })} invalid`);

        expect(() => rpc('a', 'b', 'c')).rejects.toEqual('Could not be parsed as JSON-RPC: {"this":"is"} invalid');
    });

    it('handles error response', () => {
        window.jsonrpc.mockReturnValueOnce(JSON.stringify({
            error: 'This id is not known'
        }));

        expect(() => rpc('a', 'b', 'c')).rejects.toEqual(
            'Error returned from JSON-RPC API ["a",["b","c"]]: "This id is not known"'
        );
    });

    it('handles missing result', () => {
        window.jsonrpc.mockReturnValueOnce(JSON.stringify({
            id: 0
        }));

        expect(() => rpc('a', 'b', 'c')).rejects.toEqual('Invalid JSON-RPC response {"id":0}');
    });

    it('handles mixed messages', () => {
        window.jsonrpc.mockReturnValueOnce(JSON.stringify({
            id: 0,
            result: 'everything is fine',
            error: 'nothing is fine'
        }));

        expect(() => rpc('a', 'b', 'c')).rejects.toEqual(
            'Error returned from JSON-RPC API ["a",["b","c"]]: "nothing is fine"'
        );
    });
});
