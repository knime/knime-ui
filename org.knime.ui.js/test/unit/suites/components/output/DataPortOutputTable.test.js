import { shallowMount } from '@vue/test-utils';


import DataPortOutputTable from '~/components/output/DataPortOutputTable';
import DataPortOutputTableHeader from '~/components/output/DataPortOutputTableHeader';
import DataPortOutputTableBody from '~/components/output/DataPortOutputTableBody';

describe('DataPortOutputTable.vue', () => {

    it('renders a header', () => {
        let wrapper = shallowMount(DataPortOutputTable);
        expect(wrapper.findComponent(DataPortOutputTableHeader).exists()).toBe(true);
    });

    it('renders a body', () => {
        let wrapper = shallowMount(DataPortOutputTable);
        expect(wrapper.findComponent(DataPortOutputTableBody).exists()).toBe(true);
    });

});
