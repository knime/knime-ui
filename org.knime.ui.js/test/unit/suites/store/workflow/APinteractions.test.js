/* eslint-disable no-magic-numbers */
/* eslint-disable max-lines */
import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';
import Vuex from 'vuex';

describe('workflow store: AP Interactions', () => {
    let store, localVue, loadStore,
        openLegacyFlowVariableDialogMock;

    beforeAll(() => {
        localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        store = null;
        openLegacyFlowVariableDialogMock = jest.fn();

        loadStore = async ({ apiMocks = {} } = {}) => {
            /**
             * We have to import the workflow-store dynamically to apply our ~api mocks.
             * Because the module is cached after it is required for the first time,
             * a reset is needed
             */
            jest.resetModules();
            jest.doMock('~api', () => ({
                __esModule: true,
                ...apiMocks,
                openLegacyFlowVariableDialog: openLegacyFlowVariableDialogMock
            }), { virtual: true });

            store = mockVuexStore({
                workflow: await import('~/store/workflow')
            });
        };
    });

    describe('actions', () => {
        it.each(['openView', 'openDialog'])('passes %s to API', async (action) => {
            let mock = jest.fn();
            let apiMocks = { [action]: mock };
            await loadStore({ apiMocks });
            store.commit('workflow/setActiveWorkflow', { projectId: 'foo' });
            store.dispatch(`workflow/${action}`, 'node x');

            expect(mock).toHaveBeenCalledWith({ nodeId: 'node x', projectId: 'foo' });
        });

        // TODO: NXT-1007 improve tests by making an easier API mock import
        it('calls openFlowVariableConfiguration from API', async () => {
            await loadStore();
            store.commit('workflow/setActiveWorkflow', { projectId: 'foo' });
            store.dispatch('workflow/openFlowVariableConfiguration', 'node x');

            expect(openLegacyFlowVariableDialogMock).toHaveBeenCalledWith({ nodeId: 'node x', projectId: 'foo' });
        });

        // TODO: refactor this test
        it.each([
            ['openLayoutEditor']
        ])('passes %s to the API', async (action) => {
            let mock = jest.fn();
            let apiMocks = { [action]: mock };
            await loadStore({ apiMocks });
            store.commit('workflow/setActiveWorkflow', { projectId: 'foo' });

            store.dispatch(`workflow/${action}`);

            expect(mock).toHaveBeenCalledWith({ projectId: 'foo', workflowId: 'root' });
        });


        it('saves the workflow via the API', async () => {
            let saveWorkflow = jest.fn();
            let apiMocks = { saveWorkflow };
            await loadStore({ apiMocks });
            store.commit('workflow/setActiveWorkflow', { projectId: 'foo' });

            store.dispatch('workflow/saveWorkflow');

            expect(saveWorkflow).toHaveBeenCalledWith({ projectId: 'foo' });
        });

        it('closes the workflow via the API', async () => {
            let closeWorkflow = jest.fn();
            let apiMocks = { closeWorkflow };
            await loadStore({ apiMocks });
            store.commit('workflow/setActiveWorkflow', { projectId: 'foo' });

            store.dispatch('workflow/closeWorkflow');

            expect(closeWorkflow).toHaveBeenCalledWith({ projectId: 'foo' });
        });
    });
});
