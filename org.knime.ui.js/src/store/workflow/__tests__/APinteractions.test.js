/* eslint-disable max-lines */
import Vuex from 'vuex';
import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '@/test/test-utils';

describe('workflow store: AP Interactions', () => {
    let store, localVue, loadStore, dispatchSpy;

    beforeAll(() => {
        localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        store = null;

        loadStore = async ({ apiMocks = {} } = {}) => {
            /**
             * We have to import the workflow-store dynamically to apply our @api mocks.
             * Because the module is cached after it is required for the first time,
             * a reset is needed
             */
            jest.resetModules();
            jest.doMock('@api', () => ({
                __esModule: true,
                ...apiMocks
            }), { virtual: true });

            store = mockVuexStore({
                workflow: await import('@/store/workflow'),
                application: await import('@/store/application')
            });
            dispatchSpy = jest.spyOn(store, 'dispatch');
        };
    });

    describe('actions', () => {
        it('calls openView from API', async () => {
            let openView = jest.fn();
            await loadStore({ apiMocks: { openView } });

            store.commit('workflow/setActiveWorkflow', { projectId: 'foo' });
            store.dispatch('workflow/openView', 'node x');

            expect(openView).toHaveBeenCalledWith({ nodeId: 'node x', projectId: 'foo' });
        });

        it('calls openNodeDialog from API', async () => {
            let openNodeDialog = jest.fn();
            await loadStore({ apiMocks: { openNodeDialog } });

            store.commit('workflow/setActiveWorkflow', { projectId: 'foo' });
            store.dispatch('workflow/openNodeConfiguration', 'node x');

            expect(openNodeDialog).toHaveBeenCalledWith({ nodeId: 'node x', projectId: 'foo' });
        });

        it('calls openFlowVariableConfiguration from API', async () => {
            let openLegacyFlowVariableDialog = jest.fn();
            await loadStore({ apiMocks: { openLegacyFlowVariableDialog } });

            store.commit('workflow/setActiveWorkflow', { projectId: 'foo' });
            store.dispatch('workflow/openFlowVariableConfiguration', 'node x');

            expect(openLegacyFlowVariableDialog).toHaveBeenCalledWith({ nodeId: 'node x', projectId: 'foo' });
        });


        it('calls openLayoutEditor from API', async () => {
            let openLayoutEditor = jest.fn();
            await loadStore({ apiMocks: { openLayoutEditor } });

            store.commit('workflow/setActiveWorkflow', { projectId: 'foo', info: { containerId: 'root' } });
            store.dispatch('workflow/openLayoutEditor', 'node x');

            expect(openLayoutEditor).toHaveBeenCalledWith({ projectId: 'foo', workflowId: 'root' });
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
            let closeWorkflow = jest.fn(() => true);
            let apiMocks = { closeWorkflow };
            await loadStore({ apiMocks });
            store.commit('workflow/setActiveWorkflow', { projectId: 'foo', info: { containerId: 'root' } });

            await store.dispatch('workflow/closeWorkflow');
            expect(closeWorkflow).toHaveBeenCalledWith({ projectId: 'foo' });
            expect(dispatchSpy).toHaveBeenCalledWith('application/removeCanvasState', {});
        });

        it('does not remove canvas state if closeWorkflow is cancelled', async () => {
            let closeWorkflow = jest.fn(() => false);
            let apiMocks = { closeWorkflow };
            await loadStore({ apiMocks });
            store.commit('workflow/setActiveWorkflow', { projectId: 'foo', info: { containerId: 'root' } });

            await store.dispatch('workflow/closeWorkflow');
            expect(closeWorkflow).toHaveBeenCalledWith({ projectId: 'foo' });
            expect(dispatchSpy).not.toHaveBeenCalledWith('application/removeCanvasState', {});
        });
    });
});
