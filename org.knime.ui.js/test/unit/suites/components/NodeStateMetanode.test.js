import { shallowMount } from '@vue/test-utils';

import NodeStateMetanode from '~/components/NodeStateMetanode';
import * as $colors from '~/style/colors';

describe('State of Metanode', () => {
    const mount = (state) => shallowMount(NodeStateMetanode, {
        propsData: { executionState: state },
        mocks: { $colors }
    });

    it('IDLE: draws nothing', () => {
        const wrapper = mount('IDLE');
        expect(wrapper.findAll('g *').length).toBe(0);
    });

    it('EXECUTED: draws check mark', () => {
        const wrapper = mount('EXECUTED');
        expect(wrapper.find('polyline').exists()).toBe(true);
    });

    it('EXECUTING: draws double arrow', () => {
        const wrapper = mount('EXECUTING');
        expect(wrapper.find('polygon').exists()).toBe(true);
    });
});
