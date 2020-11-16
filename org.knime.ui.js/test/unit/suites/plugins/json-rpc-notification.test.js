import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';
import Vuex from 'vuex';

jest.mock('~/store/jsonrpc', () => ({
    actions: {
        myAction: () => {},
        erroneousAction: () => {}
    }
}), { virtual: true });

import loadPlugin from '~/plugins/json-rpc-notification';

describe('jsonrpcNotification handler', () => {
    let localVue, actionMock, store;

    beforeAll(() => {
        localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        actionMock = jest.fn();
        store = mockVuexStore({
            jsonrpc: {
                actions: {
                    myAction: actionMock,
                    erroneousAction: () => { throw new Error('boo!'); }
                }
            }
        });
    });

    it('defines a global function', () => {
        loadPlugin();
        expect(window.jsonrpcNotification).toBeInstanceOf(Function);
    });

    it('passes calls to store', () => {
        loadPlugin({ store });
        let result = window.jsonrpcNotification('{"jsonrpc":"2.0","method":"myAction","params":["foo"]}');
        expect(actionMock).toHaveBeenCalledWith(expect.anything(), ['foo']);
        expect(result).toBe('{"jsonrpc":"2.0","result":"ok"}');
    });

    describe('error handling', () => {
        beforeEach(() => {
            loadPlugin({ store });
        });

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
            loadPlugin({ store });
            let result = window.jsonrpcNotification('{"jsonrpc":"2.0","method":"invalidAction","params":["foo"]}');
            expect(actionMock).not.toHaveBeenCalled();
            expect(result).toBe(JSON.stringify({
                jsonrpc: '2.0',
                error: { code: -32601, message: 'Method "invalidAction" not found' }
            }));
        });

        it('forwards internal errors', () => {
            loadPlugin({ store });
            let result = window.jsonrpcNotification('{"jsonrpc":"2.0","method":"erroneousAction","params":[]}');
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
