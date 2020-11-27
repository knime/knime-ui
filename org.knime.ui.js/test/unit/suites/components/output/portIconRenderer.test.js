import portIcon from '~/components/output/PortIconRenderer';
import { mount } from '@vue/test-utils';

import * as $colors from '~/style/colors';
import * as $shapes from '~/style/shapes';

describe('PortIconRenderer', () => {
    it('renders a table portIcon', () => {
        let PortIcon = portIcon({
            type: 'table',
            state: 'EXECUTED'
        });
        let wrapper = mount(PortIcon, {
            mocks: { $colors, $shapes }
        });
        expect(wrapper.element.tagName.toLowerCase()).toBe('svg');
        expect(wrapper.findAll('g').length).toBe(1);
        expect(wrapper.findAll('g *').length).toBe(1);
        expect(wrapper.find('g *').element.tagName.toLowerCase()).toBe('polygon');
    });
    it('renders a flowVar port Icon', () => {
        let PortIcon = portIcon({
            type: 'flowVariable',
            inactive: true,
            state: 'EXECUTED'
        });
        let wrapper = mount(PortIcon, {
            mocks: { $colors, $shapes }
        });
        expect(wrapper.element.tagName.toLowerCase()).toBe('svg');
        expect(wrapper.findAll('g').length).toBe(1);
        expect(wrapper.findAll('g *').length).toBe(3); // 1 circle + 2 paths for "X"
        expect(wrapper.find('g *').element.tagName.toLowerCase()).toBe('circle');
    });
});
