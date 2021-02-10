import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';
import Vuex from 'vuex';

describe('flowVariables store', () => {

    let dummyVariable, store, localVue, loadFlowVariables, flowVariablesStoreConfig;

    beforeAll(async () => {

        dummyVariable = [
            {
                ownerNodeId: 'testOwner',
                type: 'StringValue',
                name: 'testFlowVariable1',
                value: 'test1'
            },
            {
                type: 'IntValue',
                name: 'testFlowVariable2',
                value: 'test2'
            }
        ];

        loadFlowVariables = jest.fn().mockReturnValue(dummyVariable);

        jest.doMock('~api', () => ({
            __esModule: true,
            loadFlowVariables
        }), { virtual: true });

        localVue = createLocalVue();
        localVue.use(Vuex);

        flowVariablesStoreConfig = await import('~/store/flowVariables');
    });

    beforeEach(() => {
        store = mockVuexStore({
            flowVariables: flowVariablesStoreConfig
        });
    });

    it('creates an empty store', () => {
        expect(store.state.flowVariables).toStrictEqual({
            flowVariables: null
        });
    });

    it('allows to set flowVariables', () => {
        store.commit('flowVariables/setFlowVariables', dummyVariable);
        expect(store.state.flowVariables).toStrictEqual({
            flowVariables: dummyVariable
        });
    });

    it('allows to clear flowVariables', () => {
        store.commit('flowVariables/setFlowVariables', dummyVariable);
        store.dispatch('flowVariables/clear');
        expect(store.state.flowVariables).toStrictEqual({
            flowVariables: null
        });
    });

    it('can load flowVariables', async () => {
        await store.dispatch('flowVariables/load', {
            projectId: 'dummy',
            nodeId: 'dummy',
            portIndex: 0
        });
        expect(store.state.flowVariables).toStrictEqual({
            flowVariables: [
                {
                    ownerNodeId: 'testOwner',
                    type: 'StringValue',
                    name: 'testFlowVariable1',
                    value: 'test1'
                },
                {
                    type: 'IntValue',
                    name: 'testFlowVariable2',
                    value: 'test2'
                }
            ]
        });
    });

});
