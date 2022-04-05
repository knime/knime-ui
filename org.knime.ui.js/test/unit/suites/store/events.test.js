import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';
import Vuex from 'vuex';
import * as eventsStoreConfig from '~/store/events';

describe('Events store', () => {
    let store, localVue, patchApplyMock, replaceApplicationStateMock;

    beforeAll(() => {
        localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        patchApplyMock = jest.fn();
        replaceApplicationStateMock = jest.fn();
        store = mockVuexStore({
            events: eventsStoreConfig,
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
            store.dispatch('events/WorkflowChangedEvent', [{ patch: { ops: [{ dummy: true, path: '/foo/bar' }] } }]);

            expect(patchApplyMock).toHaveBeenCalledWith(
                expect.anything(),
                [{ dummy: true, path: '/activeWorkflow/foo/bar' }]
            );
        });

        it('handles AppStateChangedEvents', () => {
            store.dispatch('events/AppStateChangedEvent', [{ appState: { openedWorkflows: { id: 1 } } }]);

            expect(replaceApplicationStateMock).toHaveBeenCalledWith(
                expect.anything(), { openedWorkflows: { id: 1 } }
            );
        });
    });
});
