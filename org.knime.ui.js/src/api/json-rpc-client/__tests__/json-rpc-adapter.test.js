import { expect, describe, beforeEach, it, vi } from 'vitest';
import { rpc } from '../json-rpc-adapter';

describe('JSON-RPC adapter', () => {
    beforeEach(() => {
        window.jsonrpc = vi.fn().mockReturnValue({
            jsonrpc: '2.0',
            result: 'dummy result',
            id: 0
        });
    });

    it('performs a JSON-RPC call on window.jsonrpc', async () => {
        let result = await rpc('method', { arg1: 'arg1', arg2: 'arg2' });
        expect(window.jsonrpc).toHaveBeenCalledWith({
            jsonrpc: '2.0',
            method: 'method',
            params: { arg1: 'arg1', arg2: 'arg2' },
            id: 0
        });
        expect(result).toBe('dummy result');
    });

    it('handles serialized result', async () => {
        window.jsonrpc = vi.fn().mockReturnValue(JSON.stringify({
            jsonrpc: '2.0',
            result: 'dummy result',
            id: 0
        }));

        let result = await rpc('method', { arg1: 'arg1', arg2: 'arg2' });
        expect(result).toBe('dummy result');
    });

    it('handles errors during call', async () => {
        window.jsonrpc.mockImplementationOnce(() => {
            throw new Error('internal error');
        });

        await expect(rpc('method', { arg1: 'arg1', arg2: 'arg2' })).rejects
            .toThrow('Error calling JSON-RPC api "method", "{"arg1":"arg1","arg2":"arg2"}": internal error');
    });

    it('handles error response', async () => {
        window.jsonrpc.mockReturnValueOnce({
            error: 'This id is not known'
        });

        await expect(rpc('method', { arg1: 'arg1', arg2: 'arg2' })).rejects.toThrow(
            'Error returned from JSON-RPC API ["method",{"arg1":"arg1","arg2":"arg2"}]: "This id is not known"'
        );
    });

    it('handles missing result', async () => {
        window.jsonrpc.mockReturnValueOnce({
            id: 0
        });

        await expect(rpc('method', { arg1: 'arg1', arg2: 'arg2' })).rejects.toThrow(
            'Invalid JSON-RPC response: Neither error nor result exist.\n{"id":0}'
        );
    });

    it('handles mixed messages', async () => {
        window.jsonrpc.mockReturnValueOnce({
            id: 0,
            result: 'everything is fine',
            error: 'nothing is fine'
        });

        await expect(rpc('method', { arg1: 'arg1', arg2: 'arg2' })).rejects.toThrow(
            'Error returned from JSON-RPC API ["method",{"arg1":"arg1","arg2":"arg2"}]: "nothing is fine"'
        );
    });
});
