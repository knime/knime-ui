import { shallowMount } from '@vue/test-utils';


import FlowVariablePortOutputTable from '~/components/output/FlowVariablePortOutputTable';
import FlowVariablePortOutputTableHeader from '~/components/output/FlowVariablePortOutputTableHeader';
import FlowVariablePortOutputTableBody from '~/components/output/FlowVariablePortOutputTableBody';

describe('FlowVariablePortOutputTable.vue', () => {

    it('renders a header', () => {
        let wrapper = shallowMount(FlowVariablePortOutputTable);
        expect(wrapper.findComponent(FlowVariablePortOutputTableHeader).exists()).toBe(true);
    });

    it('renders a body', () => {
        let wrapper = shallowMount(FlowVariablePortOutputTable);
        expect(wrapper.findComponent(FlowVariablePortOutputTableBody).exists()).toBe(true);
    });

});
