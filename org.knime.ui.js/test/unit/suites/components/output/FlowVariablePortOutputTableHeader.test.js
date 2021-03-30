import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';

import FlowVariablePortOutputTableHeader from '~/components/output/FlowVariablePortOutputTableHeader';

describe('FlowVariablePortOutputTableHeader.vue', () => {
    let propsData, mocks, doShallowMount, wrapper, $store;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;
        propsData = {};
        $store = mockVuexStore({
        });

        mocks = { $store };
        doShallowMount = () => {
            wrapper = shallowMount(FlowVariablePortOutputTableHeader, { propsData, mocks });
        };
    });

    it('renders rows and columns', () => {
        doShallowMount();
        expect(wrapper.findAll('tr').length).toBe(1);
        expect(wrapper.findAll('th').length).toBe(4); // eslint-disable-line no-magic-numbers
    });

    it('renders content', () => {
        doShallowMount();
        let cells = wrapper.findAll('th');
        /* eslint-disable no-magic-numbers */
        expect(cells.at(0).find('.title').text()).toBe('Owner ID');
        expect(cells.at(1).find('.title').text()).toBe('Data Type');
        expect(cells.at(2).find('.title').text()).toBe('Variable Name');
        expect(cells.at(3).find('.title').text()).toBe('Value');
        /* eslint-enable no-magic-numbers */
    });
});
