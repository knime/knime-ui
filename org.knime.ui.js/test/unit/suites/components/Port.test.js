import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';
import Vuex from 'vuex';
import Vue from 'vue';

import Port from '~/components/Port';
import * as $shapes from '~/style/shapes';
import * as $colors from '~/style/colors';

describe('Port', () => {
    let propsData, mocks, mount, wrapper;
    const provide = {
        anchorPoint: { x: 123, y: 456 }
    };

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    describe.each([
        ['flowVariable', 'circle', $colors.portColors.variable],
        ['table', 'polygon', $colors.portColors.data],
        ['other', 'rect', '#123442']
    ])('Port (%s)', (portDataType, portTag, portColor) => {

        const currentPort = () => {
            let el = wrapper.find('polygon');
            if (el.exists()) {
                return el;
            }
            el = wrapper.find('circle');
            if (el.exists()) {
                return el;
            }
            el = wrapper.find('rect');
            if (el.exists()) {
                return el;
            }
            return undefined;
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

                expect(fill).toBe($colors.portColors.variable);
                expect(stroke).toBe(portColor);
            });
        }

        it.each(['IDLE'])('draws traffic light for state %s (red)', (state) => {
            propsData.port.nodeState = state;
            mount();

            let { fill: bgColor } = wrapper.findAll('g g circle').at(1).attributes();
            let { d, transform } = wrapper.find('g g path').attributes();

            expect(bgColor).toBe($colors.trafficLight.red);
            expect(d).not.toContain('h');
            expect(transform).toBeUndefined();
        });
        it.each(['CONFIGURED', 'QUEUED'])('draws traffic light for state %s (yellow)', (state) => {
            propsData.port.nodeState = state;
            mount();

            let { fill: bgColor } = wrapper.findAll('g g circle').at(1).attributes();
            let { d, transform } = wrapper.find('g g path').attributes();

            expect(bgColor).toBe($colors.trafficLight.yellow);
            expect(d).toContain('h');
            expect(transform).toBe('rotate(90)');
        });
        it.each(['HALTED', 'EXECUTED'])('draws traffic light for state %s (green)', (state) => {
            propsData.port.nodeState = state;
            mount();

            let { fill: bgColor } = wrapper.findAll('g g circle').at(1).attributes();
            let { d, transform } = wrapper.find('g g path').attributes();

            expect(bgColor).toBe($colors.trafficLight.green);
            expect(d).toContain('h');
            expect(transform).toBeUndefined();
        });
        it.each(['EXECUTING'])('draws traffic light for state %s (blue)', (state) => {
            propsData.port.nodeState = state;
            mount();

            let { fill: bgColor } = wrapper.findAll('g g circle').at(1).attributes();
            let { d, transform } = wrapper.find('g g path').attributes();

            expect(bgColor).toBe($colors.trafficLight.blue);
            expect(d).not.toContain('h');
            expect(transform).toBeUndefined();
        });


    });

    describe('tooltips', () => {
        let currentTooltip;

        beforeEach(() => {
            wrapper = null;
            propsData = {
                x: 5,
                y: 10,
                port: {
                    optional: false,
                    inactive: false,
                    index: 0,
                    type: 'table',
                    color: '#123442',
                    name: 'portName',
                    info: 'portInfo'
                }
            };
            let $store = mockVuexStore({
                workflow: {
                    mutations: {
                        setTooltip(state, tooltip) {
                            currentTooltip = tooltip;
                        }
                    }
                }
            });
            mocks = { $shapes, $colors, $store };
            mount = () => {
                wrapper = shallowMount(Port, { propsData, mocks, provide });
            };
        });

        it('shows tooltips on table ports', async () => {
            mount();
            wrapper.find('g').trigger('mouseenter');
            await Vue.nextTick();
            expect(currentTooltip).toStrictEqual({
                anchorPoint: { x: 123, y: 456 },
                text: 'portInfo',
                title: 'portName',
                orientation: 'top',
                x: 5,
                y: 5.5
            });

            wrapper.find('g').trigger('mouseleave');
            await Vue.nextTick();
            expect(currentTooltip).toBeFalsy();
        });

        it('shows tooltips for non-table ports', async () => {
            propsData.port.type = 'something';

            mount();
            wrapper.find('g').trigger('mouseenter');
            await Vue.nextTick();
            expect(currentTooltip).toStrictEqual({
                anchorPoint: { x: 123, y: 456 },
                text: 'portInfo',
                title: 'portName',
                orientation: 'top',
                x: 5,
                y: 3.5 // more space than for table
            });
        });
    });
});
