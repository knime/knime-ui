import { shallowMount, createLocalVue } from '@vue/test-utils';

import Port from '~/components/Port';
import * as $shapes from '~/style/shapes';
import * as $colors from '~/style/colors';

describe.each([
    ['org.knime.core.node.port.flowvariable.FlowVariablePortObject', 'circle'],
    ['org.knime.core.node.BufferedDataTable', 'polygon'],
    ['other', 'rect']
])('Port (%s)', (portObjectClassName, portTag) => {
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

    beforeAll(() => {
        createLocalVue();
    });

    beforeEach(() => {
        wrapper = null;
        propsData = {
            x: 5,
            y: 10,
            inPort: false,
            port: {
                summary: 'Variables connection',
                inactive: false,
                portIndex: 0,
                portType: {
                    portObjectClassName,
                    optional: false
                },
                portName: 'Variable Outport',
                type: 'NodeOutPort'
            }
        };
        mocks = { $shapes, $colors };
        mount = () => { wrapper = shallowMount(Port, { propsData, mocks }); };
    });

    describe('render', () => {
        beforeEach(() => {
            mount();
        });

        it('renders correct port', () => {
            expect(currentPort().selector).toBe(portTag);
        });

        it('not inactive', () => {
            expect(wrapper.find('line').exists()).toBe(false);
        });

        it('renders unoptional (filled)', () => {
            let port = currentPort();
            let { fill, stroke } = port.attributes();

            expect(fill).toBeTruthy();
            expect(fill).not.toBe('none'); // TODO: check for exact color NXT-219

            expect(stroke).toBe('none');
        });
    });

    it('renders inactive port', () => {
        propsData.port.inactive = true;
        mount();

        expect(wrapper.findAll('line').length).toBe(2);
    });

    it('renders optional port', () => {
        propsData.port.portType.optional = true;
        mount();

        let port = currentPort();
        let { fill, stroke } = port.attributes();

        expect(fill).toBe('none');
        expect(stroke).toBeTruthy();
        expect(stroke).not.toBe('none'); // TODO: check for exact color NXT-219
    });

    it('switches side', () => {
        mount();
    });
});
