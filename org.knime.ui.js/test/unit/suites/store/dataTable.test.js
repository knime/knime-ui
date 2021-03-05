import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';
import Vuex from 'vuex';

describe('dataTable store', () => {

    let dummyTable, dummyVariable, additionalRows, store, localVue, loadTable, dataTableStoreConfig,
        flowVariablesTableStoreConfig;

    beforeAll(async () => {
        localVue = createLocalVue();
        localVue.use(Vuex);

        loadTable = jest.fn().mockImplementation(({ offset = 0, batchSize }) => {
            if (offset === 0) {
                return JSON.parse(JSON.stringify(dummyTable));
            } else {
                return JSON.parse(JSON.stringify(additionalRows));
            }
        });

        jest.doMock('~api', () => ({
            __esModule: true,
            loadTable
        }), { virtual: true });
        dataTableStoreConfig = await import('~/store/dataTable');
    });

    beforeEach(async () => {
        loadTable.mockClear();

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

        additionalRows = {
            rows: [{
                cells: [{ valueAsString: 'foo' }, { valueAsString: '42' }]
            }, {
                cells: [{ valueAsString: 'bar' }, { valueAsString: '-42' }]
            }]
        };

        dummyVariable = [
            {
                ownerNodeId: 'testOwner',
                type: 'StringValue',
                name: 'testFlowVariable1',
                value: 'test1'
            }
        ];

        dataTableStoreConfig = await import('~/store/dataTable');
        flowVariablesTableStoreConfig = await import('~/store/flowVariables');
    });

    beforeEach(() => {
        store = mockVuexStore({
            dataTable: dataTableStoreConfig,
            flowVariables: flowVariablesTableStoreConfig
        });
    });

    it('creates an empty store', () => {
        expect(store.state.dataTable).toStrictEqual({
            rows: null,
            totalNumRows: 0,
            cellTypes: {},
            columns: null,
            totalNumColumns: 0,
            projectId: null,
            nodeId: null,
            portIndex: null,
            isReady: false,
            isLoading: false,
            requestID: 0
        });
    });

    describe('mutations', () => {


        it('allows to set table', () => {
            store.commit('dataTable/setTable', dummyTable);
            expect(store.state.dataTable).toMatchObject({
                rows: dummyTable.rows,
                totalNumRows: dummyTable.totalNumRows,
                cellTypes: dummyTable.spec.cellTypes,
                columns: dummyTable.spec.columns,
                totalNumColumns: dummyTable.spec.totalNumColumns
            });
        });

        test('set isReady', () => {
            expect(store.state.dataTable.isReady).toBe(false);
            store.commit('dataTable/setIsReady', true);
            expect(store.state.dataTable.isReady).toBe(true);
        });

        test('set isLoading', () => {
            expect(store.state.dataTable.isLoading).toBe(false);
            store.commit('dataTable/setIsLoading', true);
            expect(store.state.dataTable.isLoading).toBe(true);
        });

        test('setTableIdentifier', () => {
            store.commit('dataTable/setTableIdentifier', {
                projectId: 'a',
                nodeId: 'b',
                portIndex: 'c'
            });
            expect(store.state.dataTable).toMatchObject({
                projectId: 'a',
                nodeId: 'b',
                portIndex: 'c'
            });
        });

        it('appends rows', () => {
            store.state.dataTable.rows = [];
            store.commit('dataTable/appendRows', [0, 1, 2]);
            expect(store.state.dataTable.rows).toStrictEqual([0, 1, 2]);
        });

        it('allows to clear table', () => {
            store.commit('dataTable/setTable', dummyTable);
            store.dispatch('dataTable/clear');
            expect(store.state.dataTable).toStrictEqual({
                rows: null,
                totalNumRows: 0,
                cellTypes: {},
                columns: null,
                totalNumColumns: 0,
                projectId: null,
                nodeId: null,
                portIndex: null,
                isReady: false,
                isLoading: false,
                requestID: 1
            });
        });
    });

    describe('getters', () => {
        test('canLoadMoreRows -> infinite table', () => {
            store.state.dataTable.totalNumRows = -1;
            expect(store.getters['dataTable/canLoadMoreRows']).toBe(true);
        });

        test('canLoadMoreRows -> not at end', () => {
            store.state.dataTable.totalNumRows = 2;
            store.state.dataTable.rows = new Array(1);
            expect(store.getters['dataTable/canLoadMoreRows']).toBe(true);
        });

        test('canLoadMoreRows -> at end', () => {
            store.state.dataTable.totalNumRows = 2;
            store.state.dataTable.rows = new Array(2);
            expect(store.getters['dataTable/canLoadMoreRows']).toBe(false);
        });


    });

    describe('actions', () => {

        it('can load a table and clears the flow variable tab', async () => {
            store.state.flowVariables.flowVariables = dummyVariable;
            let loadTableAction = store.dispatch('dataTable/load', {
                projectId: '0',
                nodeId: '1',
                portIndex: 2
            });

            expect(store.state.dataTable.isLoading).toBe(true);
            expect(store.state.dataTable.isReady).toBe(false);
            await loadTableAction;
            expect(store.state.dataTable.isLoading).toBe(false);
            expect(store.state.dataTable.isReady).toBe(true);

            expect(loadTable).toHaveBeenCalledWith({
                projectId: '0',
                nodeId: '1',
                portIndex: 2,
                batchSize: 100
            });
            expect(store.state.dataTable).toMatchObject({
                rows: dummyTable.rows,
                totalNumRows: dummyTable.totalNumRows,
                cellTypes: dummyTable.spec.cellTypes,
                columns: dummyTable.spec.columns,
                totalNumColumns: dummyTable.spec.totalNumColumns,
                projectId: '0',
                nodeId: '1',
                portIndex: 2
            });
            expect(store.state.flowVariables).toEqual({
                flowVariables: null
            });
        });

        it('loads more rows', async () => {
            await store.dispatch('dataTable/load', {
                projectId: '0',
                nodeId: '1',
                portIndex: 2
            });

            expect(store.state.dataTable.isLoading).toBe(false);

            let loadMoreRows = store.dispatch('dataTable/loadMoreRows');

            expect(store.state.dataTable.isLoading).toBe(true);
            await loadMoreRows;
            expect(store.state.dataTable.isLoading).toBe(false);

            expect(loadTable).toHaveBeenNthCalledWith(2, {
                projectId: '0',
                nodeId: '1',
                offset: dummyTable.rows.length,
                portIndex: 2,
                batchSize: 450
            });
            expect(store.state.dataTable).toMatchObject({
                rows: [...dummyTable.rows, ...additionalRows.rows],
                totalNumRows: dummyTable.totalNumRows,
                cellTypes: dummyTable.spec.cellTypes,
                columns: dummyTable.spec.columns,
                totalNumColumns: dummyTable.spec.totalNumColumns,
                projectId: '0',
                nodeId: '1',
                portIndex: 2
            });
        });

        test('load more - aborted', async () => {
            await store.dispatch('dataTable/load', {
                projectId: '0',
                nodeId: '1',
                portIndex: 2
            });

            // start loading
            let loadMoreRows = store.dispatch('dataTable/loadMoreRows');
            // clear table in the meantime
            await store.dispatch('dataTable/clear');
            await loadMoreRows;

            // no rows have been added
            // doesn't throw an error
            expect(store.state.dataTable.rows).toBe(null);
            expect(store.state.dataTable.requestID).toBe(1);
        });

        test('load table - aborted', async () => {
            // start loading
            let loadTable = store.dispatch('dataTable/load', {
                projectId: '0',
                nodeId: '1',
                portIndex: 2
            });

            // clear table in the meantime
            await store.dispatch('dataTable/clear');
            await loadTable;

            // no rows have been added
            // doesn't throw an error
            expect(store.state.dataTable.rows).toBe(null);
            expect(store.state.dataTable.requestID).toBe(1);
        });
    });

});
