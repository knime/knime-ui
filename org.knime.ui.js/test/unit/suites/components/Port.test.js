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
        nodeId: 'dummy'
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
                workflows: {
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
                anchor: 'dummy',
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
                anchor: 'dummy',
                text: 'portInfo',
                title: 'portName',
                orientation: 'top',
                x: 5,
                y: 3.5 // more space than for table
            });
        });
    });
});
