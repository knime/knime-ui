import { shallowMount } from '@vue/test-utils';

import NodeTorsoMetanode from '~/components/workflow/NodeTorsoMetanode';
import * as $colors from '~/style/colors';

describe('State of Metanode', () => {
    const mount = (state) => shallowMount(NodeTorsoMetanode, {
        propsData: { executionState: state },
        mocks: { $colors }
    });

    it('IDLE: draws no status', () => {
        const wrapper = mount('IDLE');
        expect(wrapper.findAll('polygon, polyline').length).toBe(0);
    });

    it('EXECUTED: draws check mark', () => {
        const wrapper = mount('EXECUTED');
        expect(wrapper.findAll('polygon, polyline').length).toBe(1);
        expect(wrapper.find('polyline').exists()).toBe(true);
    });

    it('EXECUTING: draws double arrow', () => {
        const wrapper = mount('EXECUTING');
        expect(wrapper.findAll('polygon, polyline').length).toBe(1);
        expect(wrapper.find('polygon').exists()).toBe(true);
    });
});
