import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';
import Vuex from 'vuex';

describe('workflow store', () => {
    let store, localVue, templateMutationMock, nodeMutationMock, removeWorkflowMock, loadStore;

    beforeAll(() => {
        localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        templateMutationMock = jest.fn();
        nodeMutationMock = jest.fn();
        removeWorkflowMock = jest.fn();

        loadStore = async (apiMocks = {}) => {
            /**
             * We have to import the workflow-store dynamically to apply our ~api mocks.
             * Because the module is cached after it is required for the first time,
             * a reset is needed
             */
            jest.resetModules();
            jest.doMock('~api', () => ({
                __esModule: true,
                ...apiMocks
            }), { virtual: true });

            store = mockVuexStore({
                workflows: await import('~/store/workflows'),
                nodeTemplates: {
                    mutations: {
                        add: templateMutationMock
                    }
                },
                nodes: {
                    mutations: {
                        add: nodeMutationMock,
                        removeWorkflow: removeWorkflowMock
                    }
                }
            });
        };
    });

    it('creates an empty store', async () => {
        await loadStore();
        expect(store.state.workflows.workflow).toBe(null);
        expect(store.state.workflows.openedWorkflows).toHaveLength(0);
    });

    describe('mutation', () => {
        beforeEach(async () => {
            await loadStore();
        });

        it('adds workflows', () => {
            store.commit('workflows/setWorkflow', { id: 'foo' });

            expect(store.state.workflows.workflow).toStrictEqual({ id: 'foo', nodeIds: [] });
        });

        it('extracts templates', () => {
            store.commit('workflows/setWorkflow', {
                id: 'bar',
                nodeTemplates: {
                    foo: { bla: 1 },
                    bar: { qux: 2 }
                }
            });

            expect(templateMutationMock).toHaveBeenCalledWith(expect.anything(), {
                templateData: { bla: 1 }, templateId: 'foo'
            });
            expect(templateMutationMock).toHaveBeenCalledWith(expect.anything(), {
                templateData: { qux: 2 }, templateId: 'bar'
            });
            expect(store.state.workflows.workflow).toStrictEqual({ id: 'bar', nodeIds: [] });
        });

        it('extracts nodes', () => {
            store.commit('workflows/setWorkflow', {
                id: 'quux',
                nodes: {
                    foo: { bla: 1 },
                    bar: { qux: 2 }
                }
            });

            expect(nodeMutationMock).toHaveBeenCalledWith(expect.anything(), {
                nodeData: { bla: 1 }, workflowId: 'quux'
            });
            expect(nodeMutationMock).toHaveBeenCalledWith(expect.anything(), {
                nodeData: { qux: 2 }, workflowId: 'quux'
            });
            expect(store.state.workflows.workflow).toStrictEqual({ id: 'quux', nodeIds: ['foo', 'bar'] });
        });

        it('removes existing nodes from node store', () => {
            store.commit('workflows/setWorkflow', {
                id: 'quux',
                nodes: {}
            });

            expect(removeWorkflowMock).toHaveBeenCalledWith(expect.anything(), 'quux');
        });
    });

    describe('action', () => {
        it('loads workflow sucessfully', async () => {
            await loadStore({
                loadWorkflow: jest.fn().mockResolvedValue({ workflow: { id: 'wf1' } })
            });

            const spy = jest.spyOn(store, 'commit');

            await store.dispatch('workflows/loadWorkflow', 'wf1');
            expect(spy).toHaveBeenNthCalledWith(1, 'workflows/setWorkflow', { id: 'wf1' }, undefined); // eslint-disable-line no-undefined
        });

        it('initializes application state', async () => {
            await loadStore({
                fetchApplicationState: jest.fn().mockResolvedValue({
                    activeWorkflows: [{ workflow: { id: 'wf1' } }],
                    openedWorkflows: ['wf1', 'wf2']
                })
            });

            const spy = jest.spyOn(store, 'commit');
            await store.dispatch('workflows/initState');

            expect(spy).toHaveBeenNthCalledWith(1, 'workflows/setOpenedWorkflows', ['wf1', 'wf2'], undefined); // eslint-disable-line no-undefined
            expect(spy).toHaveBeenNthCalledWith(2, 'workflows/setWorkflow', { id: 'wf1' }, undefined); // eslint-disable-line no-undefined

        });
    });
});
