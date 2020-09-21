import { shallowMount } from '@vue/test-utils';

import Port from '~/components/Port';
import * as $shapes from '~/style/shapes';
import * as $colors from '~/style/colors';

describe.each([
    ['flowVariable', 'circle', $colors.portColors.variable],
    ['table', 'polygon', $colors.portColors.data],
    ['other', 'rect', '#123442']
])('Port (%s)', (portDataType, portTag, portColor) => {
    const provide = {
        nodeId: 'dummy'
    };
    let propsData, mocks, mount, wrapper;

    const currentPort = () => {
        let el = wrapper.find('polygon');
        if (el.exists()) { return el; }
        el = wrapper.find('circle');
        if (el.exists()) { return el; }
        el = wrapper.find('rect');
        if (el.exists()) { return el; }
        return undefined; // eslint-disable-line no-undefined
    };

    beforeEach(() => {
        wrapper = null;
        propsData = {
            x: 5,
            y: 10,
            port: {
                optional: false,
                inactive: false,
                index: 0,
                type: portDataType,
                color: '#123442'
            }
        };
        mocks = { $shapes, $colors };
        mount = () => {
            wrapper = shallowMount(Port, { propsData, mocks, provide });
        };
    });

    describe('renders default', () => {
        beforeEach(() => {
            mount();
        });

        it('renders correct port', () => {
            expect(currentPort().selector).toBe(portTag);
        });

        it('not inactive', () => {
            expect(wrapper.find('path').exists()).toBe(false);
        });

        it('renders mandatory (filled)', () => {
            let port = currentPort();
            let { fill, stroke } = port.attributes();

            expect(fill).toBe(portColor);
            expect(stroke).toBe(portColor);
        });

        it('translates to port position (outgoing)', () => {
            let transform = wrapper.find('g').attributes().transform;
            expect(transform).toBe(`translate(5, 10)`);
        });
    });

    it('renders inactive port', () => {
        propsData.port.inactive = true;
        mount();

        expect(wrapper.findAll('path').length).toBe(2);
    });

    it('renders optional port', () => {
        propsData.port.optional = true;
        propsData.port.index = 1;
        mount();

        let port = currentPort();
        let { fill, stroke } = port.attributes();

        expect(fill).toBe('white');
        expect(stroke).toBe(portColor);
    });

    if (portDataType === 'flowVariable') {
        it('always renders filled Mickey Mouse ears', () => {
            propsData.port.optional = true;
            propsData.port.index = 0;
            mount();

            let port = currentPort();
            let { fill, stroke } = port.attributes();

            expect(fill).toBe('red');
            expect(stroke).toBe(portColor);
        });
    }
});
