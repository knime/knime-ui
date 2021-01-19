import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';
import MissingValueIcon from '~/assets/missing-value.svg?inline';

jest.mock('~/webapps-common/ui/util/svgWithTitle', () => x => x, { virtual: true });

import DataPortOutputTableBody from '~/components/output/DataPortOutputTableBody';

describe('DataPortOutputTableBody.vue', () => {
    let propsData, mocks, doShallowMount, wrapper, $store;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;
        propsData = {};
        $store = mockVuexStore({
            dataTable: {
                state: {
                    rows: [{
                        cells: [{ valueAsString: 'foo' }, {}],
                        id: 'Row0'
                    }, {
                        cells: [{ valueAsString: 'bar' }, { valueAsString: 'baz' }]
                    }]
                }
            }
        });

        mocks = { $store };
        doShallowMount = () => {
            wrapper = shallowMount(DataPortOutputTableBody, { propsData, mocks });
        };
    });

    it('renders rows and columns', () => {
        doShallowMount();
        expect(wrapper.findAll('tr').length).toBe(2);
        expect(wrapper.findAll('td').length).toBe(2 * 3);
    });

    it('renders content', () => {
        doShallowMount();
        let cells = wrapper.findAll('td');
        /* eslint-disable no-magic-numbers */
        expect(cells.at(0).text()).toBe('Row0');
        expect(cells.at(1).text()).toBe('foo');
        expect(cells.at(2).text()).toBe('');
        expect(cells.at(3).text()).toBe('');
        expect(cells.at(4).text()).toBe('bar');
        expect(cells.at(5).text()).toBe('baz');
        /* eslint-enable no-magic-numbers */
    });

    it('shows missing value icon for missing data and row ids', () => {
        doShallowMount();
        let icons = wrapper.findAllComponents(MissingValueIcon);
        expect(icons.length).toBe(2);
        expect(icons.at(0).element.parentNode).toBe(wrapper.findAll('td').at(2).element);
        expect(icons.at(1).element.parentNode).toBe(wrapper.findAll('td').at(3).element);
    });
});
