import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';
import Vuex from 'vuex';
import * as jsonrpcStoreConfig from '~/store/jsonrpc';

describe('JSON-RPC store', () => {
    let store, localVue, patchApplyMock, replaceApplicationStateMock;

    beforeAll(() => {
        localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        patchApplyMock = jest.fn();
        replaceApplicationStateMock = jest.fn();
        store = mockVuexStore({
            jsonrpc: jsonrpcStoreConfig,
            workflow: {
                actions: {
                    'patch.apply': patchApplyMock
                }
            },
            application: {
                actions: {
                    replaceApplicationState: replaceApplicationStateMock
                }
            }
        });
    });

    describe('actions', () => {
        it('handles WorkflowChangedEvents', () => {
            store.dispatch('jsonrpc/WorkflowChangedEvent', [{ patch: { ops: [{ dummy: true, path: '/foo/bar' }] } }]);

            expect(patchApplyMock).toHaveBeenCalledWith(
                expect.anything(),
                [{ dummy: true, path: '/activeWorkflow/foo/bar' }]
            );
        });

        it('handles AppStateChangedEvents', () => {
            store.dispatch('jsonrpc/AppStateChangedEvent', [{ appState: { openedWorkflows: { id: 1 } } }]);

            expect(replaceApplicationStateMock).toHaveBeenCalledWith(
                expect.anything(), { openedWorkflows: { id: 1 } }
            );
        });
    });
});
