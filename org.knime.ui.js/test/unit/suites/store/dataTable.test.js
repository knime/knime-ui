import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';
import Vuex from 'vuex';

describe('dataTable store', () => {

    let dummyTable, store, localVue, loadTable, dataTableStoreConfig;

    beforeAll(async () => {

        dummyTable = {
            rows: [{
                cells: [{ valueAsString: 'foo' }, { valueAsString: '42' }]
            }, {
                cells: [{ valueAsString: 'bar' }, { valueAsString: '-42' }]
            }],
            spec: {
                cellTypes: {
                    'org.knime.core.data.def.IntCell': {
                        name: 'Number (integer)',
                        preferredValueId: 'org.knime.core.data.IntValue'
                    },
                    'org.knime.core.data.def.StringCell': {
                        name: 'String',
                        preferredValueId: 'org.knime.core.data.StringValue'
                    }
                },
                columns: [{
                    name: 'StringCol',
                    typeRef: 'org.knime.core.data.def.StringCell'
                }, {
                    name: 'IntCol',
                    typeRef: 'org.knime.core.data.def.IntCell',
                    domain: {
                        lowerBound: '-42',
                        upperBound: '42'
                    }
                }],
                totalNumColumns: 2
            },
            totalNumRows: 3000
        };

        loadTable = jest.fn().mockReturnValue(dummyTable);

        jest.doMock('~api', () => ({
            __esModule: true,
            loadTable
        }), { virtual: true });

        localVue = createLocalVue();
        localVue.use(Vuex);

        dataTableStoreConfig = await import('~/store/dataTable');
    });

    beforeEach(() => {
        store = mockVuexStore({
            dataTable: dataTableStoreConfig
        });
    });

    it('creates an empty store', () => {
        expect(store.state.dataTable).toStrictEqual({
            rows: null,
            totalNumRows: 0,
            cellTypes: {},
            columns: null,
            totalNumColumns: 0
        });
    });

    it('allows to set table', () => {
        store.commit('dataTable/setTable', dummyTable);
        expect(store.state.dataTable).toStrictEqual({
            rows: dummyTable.rows,
            totalNumRows: dummyTable.totalNumRows,
            cellTypes: dummyTable.spec.cellTypes,
            columns: dummyTable.spec.columns,
            totalNumColumns: dummyTable.spec.totalNumColumns
        });
    });

    it('allows to clear table', () => {
        store.commit('dataTable/setTable', dummyTable);
        store.dispatch('dataTable/clear');
        expect(store.state.dataTable).toStrictEqual({
            rows: null,
            totalNumRows: 0,
            cellTypes: {},
            columns: null,
            totalNumColumns: 0
        });
    });

    it('can load a table', async () => {
        await store.dispatch('dataTable/load', {
            projectId: 'dummy',
            nodeId: 'dummy',
            portIndex: 0
        });
        expect(store.state.dataTable).toStrictEqual({
            rows: dummyTable.rows,
            totalNumRows: dummyTable.totalNumRows,
            cellTypes: dummyTable.spec.cellTypes,
            columns: dummyTable.spec.columns,
            totalNumColumns: dummyTable.spec.totalNumColumns
        });
    });

});
