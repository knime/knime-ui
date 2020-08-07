import NodeSelect from '~/components/NodeSelect';
import { shallowMount } from '@vue/test-utils';

import * as $shapes from '~/style/shapes';
import * as $colors from '~/style/colors';

describe('NodeSelect.vue', () => {
    let wrapper;

    beforeEach(() => {
        wrapper = shallowMount(NodeSelect, {
            mocks: { $colors, $shapes },
            propsData: {
                nodeId: 'node1:2:3',
                x: 12,
                y: 73
            }
        });
    });

    it('renders node Id', () => {
        expect(wrapper.find('text').text()).toBe('node1:2:3');
    });

    it('respects node position', () => {
        expect(wrapper.find('g').attributes('transform')).toBe('translate(12, 73)');
    });
});
