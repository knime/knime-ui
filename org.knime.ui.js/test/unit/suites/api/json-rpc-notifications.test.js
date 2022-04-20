import { registerEventHandlers } from '~/api/json-rpc-notifications';

describe('JsonRpcNotifications', () => {
    let eventHandlers;

    beforeEach(() => {
        eventHandlers = {
            WorkingEvent: jest.fn(),
            ErrorEvent: jest.fn().mockImplementation(() => {
                throw new Error('boo!');
            }),
            NotFunction: null
        };
        registerEventHandlers(eventHandlers);
    });

    it('defines a global function', () => {
        expect(window.jsonrpcNotification).toBeInstanceOf(Function);
    });

    it('calls event handler successfully', () => {
        let result = window.jsonrpcNotification('{"jsonrpc":"2.0","method":"WorkingEvent","params":["foo"]}');
        expect(eventHandlers.WorkingEvent).toHaveBeenCalledWith('foo');
        expect(result).toBe('{"jsonrpc":"2.0","result":"ok"}');
    });

    describe('error handling', () => {
        it('throws an error for invalid arguments', () => {
            let call1 = () => window.jsonrpcNotification(1);
            expect(call1).toThrow(expect.any(TypeError));
            let call2 = () => window.jsonrpcNotification('{}', 'b');
            expect(call2).toThrow(expect.any(TypeError));
        });

        it('returns an error for syntactically invalid JSON', () => {
            let result = window.jsonrpcNotification('{"foo":"bar"""}');
            expect(result).toBe(JSON.stringify({
                jsonrpc: '2.0',
                id: null,
                error: { code: -32700, message: 'Argument must be a JSON serialized JSON-RPC object' }
            }));
        });

        it('returns an error for invalid JSON-RPC', () => {
            let result = window.jsonrpcNotification('{"foo":"bar","id":1}');
            expect(result).toBe(JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                error: { code: -32600, message: 'Invalid JSON-RPC format' }
            }));
        });

        it('returns an error for invalid JSON-RPC with invalid id', () => {
            let result = window.jsonrpcNotification('{"foo":"bar","id":{}}');
            expect(result).toBe(JSON.stringify({
                jsonrpc: '2.0',
                id: null,
                error: { code: -32600, message: 'Invalid JSON-RPC format' }
            }));
        });

        it('returns an error for non-existing methods', () => {
            let result = window.jsonrpcNotification('{"jsonrpc":"2.0","method":"invalidAction","params":["foo"]}');
            expect(result).toBe(JSON.stringify({
                jsonrpc: '2.0',
                error: { code: -32601, message: 'Method "invalidAction" not found' }
            }));
        });

        it('returns an error for non-function handlers', () => {
            let result = window.jsonrpcNotification('{"jsonrpc":"2.0","method":"NotFunction","params":["foo"]}');
            expect(result).toBe(JSON.stringify({
                jsonrpc: '2.0',
                error: { code: -32601, message: 'Method "NotFunction" not found' }
            }));
        });

        it('forwards internal errors', () => {
            let result = window.jsonrpcNotification('{"jsonrpc":"2.0","method":"ErrorEvent","params":[]}');
            expect(JSON.parse(result)).toStrictEqual({
                jsonrpc: '2.0',
                error: {
                    code: -32603,
                    message: 'boo!',
                    data: expect.stringMatching(/^Error: boo!\n\s*at .*/)
                }
            });
        });
    });
});
