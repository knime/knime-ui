jest.mock('~api', () => {
}, { virtual: true });
import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';
import Vuex from 'vuex';

import * as workflowStoreConfig from '~/store/workflows';

describe('workflow store', () => {

    let store, localVue, templateMutationMock, nodeMutationMock;

    beforeAll(() => {
        localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        templateMutationMock = jest.fn();
        nodeMutationMock = jest.fn();
        store = mockVuexStore({
            workflows: workflowStoreConfig,
            nodeTemplates: {
                mutations: {
                    add: templateMutationMock
                }
            },
            nodes: {
                mutations: {
                    add: nodeMutationMock
                }
            }
        });
    });

    it('creates an empty store', () => {
        expect(store.state.workflows.workflow).toBe(null);
        expect(store.state.workflows.openWorkflowIDs).toHaveLength(0);
    });

    describe('mutation', () => {
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
    });
});
