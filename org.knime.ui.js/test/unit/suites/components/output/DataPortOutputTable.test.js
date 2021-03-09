import { createLocalVue, shallowMount, mount as deepMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';

import DataPortOutputTable from '~/components/output/DataPortOutputTable';
import DataPortOutputTableHeader from '~/components/output/DataPortOutputTableHeader';
import DataPortOutputTableBody from '~/components/output/DataPortOutputTableBody';
import MissingValueIcon from '~/assets/missing-value.svg?inline';


// eslint-disable-next-line no-magic-numbers
const tableRendered = () => new Promise(resolve => setTimeout(resolve, 600));

jest.mock('lodash', () => ({
    throttle(func) {
        return function (...args) {
            // eslint-disable-next-line no-invalid-this
            return func.apply(this, args);
        };
    }
}));

describe('DataPortOutputTable.vue', () => {
    let wrapper, dataTable, $store, doMount, dummyTable, dataRowHeight;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;
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

        jest.clearAllMocks();

        dataTable = {
            state: {
                isLoading: false,
                ...dummyTable
            },
            getters: {
                canLoadMoreRows: jest.fn().mockReturnValue(true)
            },
            actions: {
                loadMoreRows: jest.fn()
            }
        };

        // eslint-disable-next-line no-magic-numbers
        dataRowHeight = 20;

        doMount = (mountMethod) => {
            $store = mockVuexStore({ dataTable });
            let mocks = { $store };
            wrapper = mountMethod(DataPortOutputTable, { mocks, stubs: { MissingValueIcon } });

            if (mountMethod === deepMount) {
                let table = wrapper.vm.$refs.table;

                // scrollHeight > 0 leads to no automatic loading
                Object.defineProperty(table, 'scrollHeight', { value: 100, configurable: true });

                // for fixing layout
                table.getBoundingClientRect = jest.fn().mockReturnValue({
                    width: 100
                });
                HTMLElement.prototype.getBoundingClientRect = jest.fn().mockReturnValue({
                    width: 50
                });

                // sets this.dataRowHeight
                table.querySelector('tbody tr').getBoundingClientRect = jest.fn().mockReturnValue({
                    height: dataRowHeight
                });
            } else {
                // if shallowMount disable fixLayout
                wrapper.vm.fixLayout = jest.fn();
            }

        };
    });

    afterEach(async () => {
        await tableRendered();
    });

    test('indicate loading', () => {
        dataTable.state.isLoading = true;
        doMount(shallowMount);
        expect(wrapper.find('tfoot').exists()).toBe(true);

        dataTable.state.isLoading = false;
        doMount(shallowMount);
        expect(wrapper.find('tfoot').exists()).toBe(false);
    });

    test('fixes layout after initial loading', async () => {
        doMount(deepMount);
        let table = wrapper.vm.$refs.table;

        await tableRendered();

        expect(table.style.width).toBe('100px');
        expect(table.style.tableLayout).toBe('fixed');

        let firstCells = table.querySelectorAll('th');
        expect(firstCells.length > 0);
        firstCells.forEach((cell) => {
            expect(cell.style.width).toBe('50px');
        });
    });

    describe('automatically loads more rows', () => {
        test('on veeeery long screens -> no overflow', async () => {
            dataTable.getters.canLoadMoreRows.mockReturnValue(true);
            doMount(deepMount);

            let table = wrapper.vm.$refs.table;
            Object.defineProperty(table, 'scrollHeight', { value: 0 });

            await tableRendered();

            expect(dataTable.actions.loadMoreRows).toHaveBeenCalled();
        });
        it('doesnt on normal screens -> overflow scroll', async () => {
            dataTable.getters.canLoadMoreRows.mockReturnValue(true);
            doMount(deepMount);

            await tableRendered();

            expect(dataTable.actions.loadMoreRows).not.toHaveBeenCalled();
        });
    });

    describe('scrolling', () => {
        test('cant load more rows', () => {
            dataTable.getters.canLoadMoreRows.mockReturnValue(false);
            doMount(shallowMount);
            wrapper.trigger('scroll');
            expect(dataTable.actions.loadMoreRows).not.toHaveBeenCalled();
        });

        test('already loading', () => {
            dataTable.state.isLoading = true;
            doMount(shallowMount);
            wrapper.trigger('scroll');
            expect(dataTable.actions.loadMoreRows).not.toHaveBeenCalled();
        });

        describe('scrolling causes lazy loading', () => {
            const windowHeight = 20; // 20 rows, doesn't matter
            test('199 items, 50 threshold', async () => {
                const noRows = 199;
                const triggerRows = 50;
                doMount(deepMount);
                wrapper.vm.$refs.table.getBoundingClientRect = jest.fn().mockReturnValue({
                    height: noRows * dataRowHeight
                });
                wrapper.vm.$el.getBoundingClientRect = jest.fn().mockReturnValue({
                    height: windowHeight * dataRowHeight
                });

                await tableRendered();

                // first test: threshold not reached
                wrapper.vm.$el.scrollTop = (noRows - triggerRows - windowHeight - 1) * dataRowHeight;
                wrapper.trigger('scroll', {});
                expect(dataTable.actions.loadMoreRows).not.toHaveBeenCalled();

                // second test: threshold reached
                wrapper.vm.$el.scrollTop = (noRows - triggerRows - windowHeight) * dataRowHeight;
                wrapper.trigger('scroll', {});
                expect(dataTable.actions.loadMoreRows).toHaveBeenCalled();
            });

            test('200 items, 150 threshold', async () => {
                const noRows = 200;
                const triggerRows = 150;
                doMount(deepMount);
                wrapper.vm.rows.length = noRows;
                wrapper.vm.$refs.table.getBoundingClientRect = jest.fn().mockReturnValue({
                    height: noRows * dataRowHeight
                });
                wrapper.vm.$el.getBoundingClientRect = jest.fn().mockReturnValue({
                    height: windowHeight * dataRowHeight
                });

                await tableRendered();

                // first test: threshold not reached
                wrapper.vm.$el.scrollTop = (noRows - triggerRows - windowHeight - 1) * dataRowHeight;
                wrapper.trigger('scroll', {});
                expect(dataTable.actions.loadMoreRows).not.toHaveBeenCalled();

                // second test: threshold reached
                wrapper.vm.$el.scrollTop = (noRows - triggerRows - windowHeight) * dataRowHeight;
                wrapper.trigger('scroll', {});
                expect(dataTable.actions.loadMoreRows).toHaveBeenCalled();
            });
        });
    });

    it('renders a header', () => {
        doMount(shallowMount);
        expect(wrapper.findComponent(DataPortOutputTableHeader).exists()).toBe(true);
    });

    it('renders a body', () => {
        doMount(shallowMount);
        expect(wrapper.findComponent(DataPortOutputTableBody).exists()).toBe(true);
    });

});
