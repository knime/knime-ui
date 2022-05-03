import portIconRenderer from '~/components/output/PortIconRenderer';
import { mount } from '@vue/test-utils';

import * as $colors from '~/style/colors';
import * as $shapes from '~/style/shapes';

describe('PortIconRenderer', () => {
    let doMount, wrapper, port, iconSize;

    beforeEach(() => {
        doMount = () => {
            wrapper = mount(portIconRenderer(port, iconSize), {
                mocks: { $colors, $shapes }
            });
        };
    });

    it('renders a table portIcon', () => {
        port = {
            type: 'table',
            state: 'EXECUTED'
        };
        doMount();
        
        expect(wrapper.element.tagName.toLowerCase()).toBe('svg');
        expect(wrapper.findAll('.scale g').length).toBe(0);
        expect(wrapper.findAll('.scale g *').length).toBe(0);
        expect(wrapper.find('.scale *').element.tagName.toLowerCase()).toBe('polygon');
    });

    it('renders a flowVar port Icon', () => {
        port = {
            type: 'flowVariable',
            inactive: true,
            state: 'EXECUTED'
        };
        doMount();

        expect(wrapper.element.tagName.toLowerCase()).toBe('svg');
        expect(wrapper.findAll('.scale g').length).toBe(0);
        expect(wrapper.findAll('.scale *').length).toBe(1 + 2); // 1 circle + 2 paths for "X"
        expect(wrapper.find('.scale *').element.tagName.toLowerCase()).toBe('circle');
    });

    it('renders the port according to the port size', () => {
        port = {
            type: 'table',
            state: 'EXECUTED'
        };
        doMount();
        
        let { portSize } = $shapes;
        expect(wrapper.attributes().viewBox).toBe(`-${portSize / 2} -${portSize / 2} ${portSize} ${portSize}`);
    });

    it('doesn´t set svg´s width', () => {
        port = {
            type: 'table',
            state: 'EXECUTED'
        };
        doMount();
        
        expect(wrapper.element.style.width).toBe('');
    });

    it('set svg´s width to provided arguments', () => {
        port = {
            type: 'table',
            state: 'EXECUTED'
        };
        iconSize = 12;
        doMount();

        expect(wrapper.element.style.width).toBe('12px');
    });
});
