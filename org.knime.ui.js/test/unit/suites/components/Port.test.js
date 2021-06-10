import { shallowMount } from '@vue/test-utils';

import Port from '~/components/Port';
import PortIcon from '~/webapps-common/ui/components/node/PortIcon';

import * as $shapes from '~/style/shapes';
import * as $colors from '~/style/colors';

describe('Port', () => {
    let propsData, mocks, doShallowMount, wrapper;

    describe.each([
        ['flowVariable', $colors.portColors.flowVariable],
        ['table', $colors.portColors.table],
        ['other', '#123442']
    ])('Port (%s)', (portDataType, portColor) => {
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
            doShallowMount = () => {
                wrapper = shallowMount(Port, { propsData, mocks });
            };
        });

        describe('renders default', () => {
            beforeEach(() => {
                doShallowMount();
            });

            it('renders correct port', () => {
                const { color, type } = wrapper.findComponent(PortIcon).props();
                expect(type).toBe(portDataType);
                expect(color).toBe(portColor);
            });

            it('not inactive', () => {
                expect(wrapper.find('path').exists()).toBe(false);
            });
            
            it('renders mandatory (filled)', () => {
                expect(wrapper.findComponent(PortIcon).props().filled).toBe(true);
            });

            it('translates to port position (outgoing)', () => {
                let transform = wrapper.find('g').attributes().transform;
                expect(transform).toBe(`translate(5, 10)`);
            });
        });

        it('renders inactive port', () => {
            propsData.port.inactive = true;
            doShallowMount();

            expect(wrapper.findAll('path').length).toBe(2);
        });

        it('renders optional port', () => {
            propsData.port.optional = true;
            propsData.port.index = 1;
            doShallowMount();

            const { filled } = wrapper.findComponent(PortIcon).props();
            expect(filled).toBe(false);
        });

        if (portDataType === 'flowVariable') {
            it('always renders filled Mickey Mouse ears', () => {
                propsData.port.optional = true;
                propsData.port.index = 0;
                doShallowMount();

                const { filled } = wrapper.findComponent(PortIcon).props();
                expect(filled).toBe(true);
            });
        }

        it.each(['IDLE'])('draws traffic light for state %s (red)', (state) => {
            propsData.port.nodeState = state;
            doShallowMount();

            let { fill: bgColor } = wrapper.findAll('g g circle').at(1).attributes();
            let { d, transform } = wrapper.find('g g path').attributes();

            expect(bgColor).toBe($colors.trafficLight.red);
            expect(d).not.toContain('h');
            expect(transform).toBeUndefined();
        });

        it.each(['CONFIGURED', 'QUEUED'])('draws traffic light for state %s (yellow)', (state) => {
            propsData.port.nodeState = state;
            doShallowMount();

            let { fill: bgColor } = wrapper.findAll('g g circle').at(1).attributes();
            let { d, transform } = wrapper.find('g g path').attributes();

            expect(bgColor).toBe($colors.trafficLight.yellow);
            expect(d).toContain('h');
            expect(transform).toBe('rotate(90)');
        });

        it.each(['HALTED', 'EXECUTED'])('draws traffic light for state %s (green)', (state) => {
            propsData.port.nodeState = state;
            doShallowMount();

            let { fill: bgColor } = wrapper.findAll('g g circle').at(1).attributes();
            let { d, transform } = wrapper.find('g g path').attributes();

            expect(bgColor).toBe($colors.trafficLight.green);
            expect(d).toContain('h');
            expect(transform).toBeUndefined();
        });

        it.each(['EXECUTING'])('draws traffic light for state %s (blue)', (state) => {
            propsData.port.nodeState = state;
            doShallowMount();

            let { fill: bgColor } = wrapper.findAll('g g circle').at(1).attributes();
            let { d, transform } = wrapper.find('g g path').attributes();

            expect(bgColor).toBe($colors.trafficLight.blue);
            expect(d).not.toContain('h');
            expect(transform).toBeUndefined();
        });
    });
});
