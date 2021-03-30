import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';
import Vuex from 'vuex';

describe('flowVariables store', () => {

    let dummyVariable, dummyTable, store, localVue, loadFlowVariables, flowVariablesStoreConfig, dataTableStoreConfig;

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

        dummyTable = {
            rows: [{
                cells: [{ valueAsString: 'foo' }, { valueAsString: '42' }]
            }]
        };

        loadFlowVariables = jest.fn().mockReturnValue(dummyVariable);

        jest.doMock('~api', () => ({
            __esModule: true,
            loadFlowVariables
        }), { virtual: true });

        localVue = createLocalVue();
        localVue.use(Vuex);

        flowVariablesStoreConfig = await import('~/store/flowVariables');
        dataTableStoreConfig = await import('~/store/dataTable');

    });

    beforeEach(() => {
        store = mockVuexStore({
            flowVariables: flowVariablesStoreConfig,
            dataTable: dataTableStoreConfig
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

    it('can load flowVariables and clears the data table when loading flow variables', async () => {
        store.state.dataTable.rows = dummyTable.rows;
        await store.dispatch('flowVariables/load', {
            projectId: 'dummy',
            nodeId: 'dummy',
            portIndex: 0
        });
        expect(store.state.flowVariables).toStrictEqual({
            flowVariables: [{
                ownerNodeId: 'testOwner',
                type: 'StringValue',
                name: 'testFlowVariable1',
                value: 'test1'
            }, {
                type: 'IntValue',
                name: 'testFlowVariable2',
                value: 'test2'
            }]
        });
        expect(store.state.dataTable).toMatchObject({
            cellTypes: {},
            columns: null,
            rows: null,
            totalNumColumns: 0,
            totalNumRows: 0
        });
    });
});
