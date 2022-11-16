import Vuex from 'vuex';
import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '@/test/test-utils';

describe('workflow store: AP Interactions', () => {
    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    const loadStore = async ({ apiMocks = {} } = {}) => {
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

        const store = mockVuexStore({
            workflow: await import('@/store/workflow'),
            application: await import('@/store/application')
        });
        const dispatchSpy = jest.spyOn(store, 'dispatch');

        return { store, dispatchSpy };
    };

    describe('actions', () => {
        it('calls openView from API', async () => {
            let openView = jest.fn();
            const { store } = await loadStore({ apiMocks: { openView } });

            store.commit('workflow/setActiveWorkflow', { projectId: 'foo' });
            store.dispatch('workflow/openView', 'node x');

            expect(openView).toHaveBeenCalledWith({ nodeId: 'node x', projectId: 'foo' });
        });

        it('calls openNodeDialog from API', async () => {
            let openNodeDialog = jest.fn();
            const { store } = await loadStore({ apiMocks: { openNodeDialog } });

            store.commit('workflow/setActiveWorkflow', { projectId: 'foo' });
            store.dispatch('workflow/openNodeConfiguration', 'node x');

            expect(openNodeDialog).toHaveBeenCalledWith({ nodeId: 'node x', projectId: 'foo' });
        });

        it('calls openFlowVariableConfiguration from API', async () => {
            let openLegacyFlowVariableDialog = jest.fn();
            const { store } = await loadStore({ apiMocks: { openLegacyFlowVariableDialog } });

            store.commit('workflow/setActiveWorkflow', { projectId: 'foo' });
            store.dispatch('workflow/openFlowVariableConfiguration', 'node x');

            expect(openLegacyFlowVariableDialog).toHaveBeenCalledWith({ nodeId: 'node x', projectId: 'foo' });
        });


        it('calls openLayoutEditor from API', async () => {
            let openLayoutEditor = jest.fn();
            const { store } = await loadStore({ apiMocks: { openLayoutEditor } });

            store.commit('workflow/setActiveWorkflow', { projectId: 'foo', info: { containerId: 'root' } });
            store.dispatch('workflow/openLayoutEditor', 'node x');

            expect(openLayoutEditor).toHaveBeenCalledWith({ projectId: 'foo', workflowId: 'root' });
        });


        it('saves the workflow via the API', async () => {
            let saveWorkflow = jest.fn();
            let apiMocks = { saveWorkflow };
            const { store } = await loadStore({ apiMocks });
            store.commit('workflow/setActiveWorkflow', { projectId: 'foo' });

            store.dispatch('workflow/saveWorkflow');

            expect(saveWorkflow).toHaveBeenCalledWith({ projectId: 'foo' });
        });

        describe.only('Close workflow', () => {
            it.each([
                [
                    'keep "active project" unchanged if closing a non-active project',
                    { activeProject: 1, closingProject: 0, expectedNextProject: 1 }
                ],
                [
                    `set the next project active if the "active project" is closed AND it's not the last in the list`,
                    { activeProject: 1, closingProject: 1, expectedNextProject: 2 }
                ],
                [
                    `set the previous project active if the "active project" is closed AND it's the last in the list`,
                    { activeProject: 2, closingProject: 2, expectedNextProject: 1 }
                ]
            ])('should %s', async (_, { activeProject, closingProject, expectedNextProject }) => {
                let closeWorkflow = jest.fn(() => true);
                let apiMocks = { closeWorkflow };

                const openProjects = [
                    { name: 'Mock project 1', projectId: 'Mock project 1' },
                    { name: 'Mock project 2', projectId: 'Mock project 2' },
                    { name: 'Mock project 3', projectId: 'Mock project 3' }
                ];
                const { projectId: activeProjectId } = openProjects[activeProject];
                const { projectId: closingProjectId } = openProjects[closingProject];
                const { projectId: expectedNextProjectId } = openProjects[expectedNextProject];

                // setup
                const { store, dispatchSpy } = await loadStore({ apiMocks });
                store.commit('application/setOpenProjects', openProjects);
                store.commit('application/setActiveProjectId', activeProjectId);
                store.commit('workflow/setActiveWorkflow', { projectId: 'foo', info: { containerId: 'root' } });

                await store.dispatch('workflow/closeWorkflow', closingProjectId);
                expect(closeWorkflow).toHaveBeenCalledWith({
                    closingProjectId,
                    nextProjectId: expectedNextProjectId
                });
                expect(dispatchSpy).toHaveBeenCalledWith('application/removeCanvasState', {});
            });
    
            it('does not remove canvas state if closeWorkflow is cancelled', async () => {
                let closeWorkflow = jest.fn(() => false);
                let apiMocks = { closeWorkflow };
                const { store, dispatchSpy } = await loadStore({ apiMocks });
    
                await store.dispatch('workflow/closeWorkflow', 'foo');
                // expect(closeWorkflow).toHaveBeenCalledWith({ projectId: 'foo' });
                expect(dispatchSpy).not.toHaveBeenCalledWith('application/removeCanvasState', {});
            });
        });
    });
});
