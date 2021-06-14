jest.mock('~api', () => ({
    loadTable: jest.fn()
}), { virtual: true });

import Vue from 'vue';
import { shallowMountWithAsyncData, mountWithAsyncData as deepMountWithAsyncData } from '~/test/unit/test-utils';
import TablePortView from '~/components/output/TablePortView';
import Header from '~/components/output/TablePortViewHeader';
import Body from '~/components/output/TablePortViewBody';
import MissingValueIcon from '~/assets/missing-value.svg?inline';
import { loadTable as loadTableMock } from '~api';

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

describe('TablePortView.vue', () => {
    let wrapper, dummyTable, doMount, dataRowHeight;

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

        // eslint-disable-next-line no-magic-numbers
        dataRowHeight = 20;

        doMount = async (mountMethod) => {
            if (dummyTable) {
                loadTableMock.mockResolvedValue(dummyTable);
            } else {
                loadTableMock.mockRejectedValue();
            }

            wrapper = await mountMethod(TablePortView, {
                propsData: {
                    projectId: 'project',
                    workflowId: 'workflow',
                    nodeId: 'node',
                    portIndex: 0
                },
                stubs: {
                    MissingValueIcon
                }
            });

            await Vue.nextTick(); // wait for fetch
            await Vue.nextTick(); // wait for watchers & render
            // wrapper.vm._watchers.find({expression} => expression === 'table')
            let table = wrapper.vm.$refs.table;

            // undefined if fetching fails
            if (table) {
                // scrollHeight > 0 prevents automatic loading
                Object.defineProperty(table, 'scrollHeight', { value: 100, configurable: true });
            }

            if (mountMethod === shallowMountWithAsyncData) {
                // if shallowMountWithAsyncData disable fixLayout
                wrapper.vm.fixLayout = jest.fn();
                // set dataRowHeight manually
                wrapper.setData({ dataRowHeight });
            }
        };
    });

    afterEach(async () => {
        loadTableMock.mockReset();
        await tableRendered();
    });

    it('fetches successfully first 100 rows', async () => {
        await doMount(shallowMountWithAsyncData);
        await Vue.nextTick();

        expect(wrapper.emitted().update[0]).toStrictEqual([{ state: 'loading' }]);
        expect(loadTableMock).toHaveBeenCalledWith({
            projectId: 'project',
            workflowId: 'workflow',
            nodeId: 'node',
            portIndex: 0,
            batchSize: 100
        });
        expect(wrapper.emitted().update[1]).toStrictEqual([{ state: 'ready' }]);
        expect(wrapper.findComponent(Body).props().rows).toStrictEqual(dummyTable.rows);
        expect(wrapper.findComponent(Header).props().columns).toStrictEqual(dummyTable.spec.columns);
        expect(wrapper.findComponent(Header).props().cellTypes).toStrictEqual(dummyTable.spec.cellTypes);
    });

    test('fetch fails', async () => {
        dummyTable = null; // causes loadTableMock to reject
        await doMount(shallowMountWithAsyncData);
        await Vue.nextTick();

        expect(wrapper.emitted().update[0]).toStrictEqual([{ state: 'loading' }]);
        expect(wrapper.emitted().update[1]).toStrictEqual([{ state: 'error', message: "Couldn't load table" }]);
    });

    test('fixes layout after initial loading', async () => {
        await doMount(deepMountWithAsyncData);

        let table = wrapper.vm.$refs.table;
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
            await doMount(shallowMountWithAsyncData);

            // set scrollHeight to zero BEFORE timeout executes
            let table = wrapper.vm.$refs.table;
            Object.defineProperty(table, 'scrollHeight', { value: 0 });

            await tableRendered();

            expect(loadTableMock).toHaveBeenCalledWith({
                projectId: 'project',
                workflowId: 'workflow',
                nodeId: 'node',
                portIndex: 0,
                batchSize: 450,
                offset: 2
            });
        });

        it('doesnt on normal screens -> overflow scroll', async () => {
            await doMount(shallowMountWithAsyncData);

            await tableRendered();

            expect(loadTableMock).toHaveBeenCalledTimes(1);
        });
    });

    describe('scrolling', () => {
        test('cant load more rows', async () => {
            loadTableMock.mockResolvedValue({ ...dummyTable, totalNumRows: 0 });
            await doMount(shallowMountWithAsyncData);
            await Vue.nextTick();
            wrapper.vm.$refs.scroller.dispatchEvent(new CustomEvent('scroll'));
            expect(loadTableMock).toHaveBeenCalledTimes(1);
        });

        test('already lazy loading', async () => {
            await doMount(shallowMountWithAsyncData);
            wrapper.setData({ isLazyLoading: true });
            wrapper.vm.$refs.scroller.dispatchEvent(new CustomEvent('scroll'));
            expect(loadTableMock).toHaveBeenCalledTimes(1);
        });

        describe('scrolling causes lazy loading', () => {
            const windowHeight = 20; // 20 rows, doesn't matter

            test('199 items, 50 threshold', async () => {
                const noRows = 199;
                const triggerRows = 50;

                dummyTable.rows.length = noRows;
                await doMount(shallowMountWithAsyncData);

                let { table, scroller } = wrapper.vm.$refs;
                table.getBoundingClientRect = jest.fn().mockReturnValue({
                    height: noRows * dataRowHeight
                });
                scroller.getBoundingClientRect = jest.fn().mockReturnValue({
                    height: windowHeight * dataRowHeight
                });

                await tableRendered();

                // first test: threshold not reached
                scroller.scrollTop = (noRows - triggerRows - windowHeight - 1) * dataRowHeight;
                scroller.dispatchEvent(new CustomEvent('scroll'));
                await Vue.nextTick();
                expect(loadTableMock).toHaveBeenCalledTimes(1);

                // second test: threshold reached
                scroller.scrollTop = (noRows - triggerRows - windowHeight) * dataRowHeight;
                scroller.dispatchEvent(new CustomEvent('scroll'));
                await Vue.nextTick();
                expect(wrapper.find('tfoot').exists()).toBe(true);
                expect(loadTableMock).toHaveBeenCalledTimes(2);
            });

            test('200 items, 150 threshold', async () => {
                const noRows = 200;
                const triggerRows = 150;

                dummyTable.rows.length = noRows;
                await doMount(shallowMountWithAsyncData);

                let { table, scroller } = wrapper.vm.$refs;
                table.getBoundingClientRect = jest.fn().mockReturnValue({
                    height: noRows * dataRowHeight
                });
                scroller.getBoundingClientRect = jest.fn().mockReturnValue({
                    height: windowHeight * dataRowHeight
                });

                await tableRendered();

                // first test: threshold not reached
                scroller.scrollTop = (noRows - triggerRows - windowHeight - 1) * dataRowHeight;
                scroller.dispatchEvent(new CustomEvent('scroll'));
                await Vue.nextTick();
                expect(loadTableMock).toHaveBeenCalledTimes(1);

                // second test: threshold reached
                scroller.scrollTop = (noRows - triggerRows - windowHeight) * dataRowHeight;
                scroller.dispatchEvent(new CustomEvent('scroll'));
                await Vue.nextTick();
                expect(wrapper.find('tfoot').exists()).toBe(true);
                expect(loadTableMock).toHaveBeenCalledTimes(2);
            });
        });
    });
});
