/* eslint-disable no-magic-numbers */
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';
import Vuex from 'vuex';
import Vue from 'vue';

import NodeState from '~/components/NodeState';
import * as $shapes from '~/style/shapes';
import * as $colors from '~/style/colors';
import muteConsole from '~/webapps-common/util/test-utils/muteConsole';

describe('NodeState.vue', () => {
    const provide = {
        nodeId: 'dummy'
    };
    let propsData, mocks, wrapper, mount;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        propsData = {
            executionState: null,
            progress: null,
            error: null,
            warning: null
        };
        mocks = { $shapes, $colors };
        mount = () => {
            wrapper = shallowMount(NodeState, { propsData, mocks, provide });
        };
    });


    const getTrafficLights = () => {
        let lights = wrapper.findAll('g g circle').wrappers.map(el => {
            const { fill, stroke } = el.attributes();
            return { fill, stroke };
        });
        return lights;
    };

    it.each([
        ['IDLE', [
            { fill: $colors.trafficLight.red, stroke: undefined },
            { fill: 'none', stroke: $colors.darkeningMask },
            { fill: $colors.trafficLight.inactive, stroke: undefined },
            { fill: 'none', stroke: $colors.trafficLight.inactiveBorder },
            { fill: $colors.trafficLight.inactive, stroke: undefined },
            { fill: 'none', stroke: $colors.trafficLight.inactiveBorder }
        ]],
        ['CONFIGURED', [
            { fill: $colors.trafficLight.inactive, stroke: undefined },
            { fill: 'none', stroke: $colors.trafficLight.inactiveBorder },
            { fill: $colors.trafficLight.yellow, stroke: undefined },
            { fill: 'none', stroke: $colors.darkeningMask },
            { fill: $colors.trafficLight.inactive, stroke: undefined },
            { fill: 'none', stroke: $colors.trafficLight.inactiveBorder }
        ]],
        ['EXECUTED', [
            { fill: $colors.trafficLight.inactive, stroke: undefined },
            { fill: 'none', stroke: $colors.trafficLight.inactiveBorder },
            { fill: $colors.trafficLight.inactive, stroke: undefined },
            { fill: 'none', stroke: $colors.trafficLight.inactiveBorder },
            { fill: $colors.trafficLight.green, stroke: undefined },
            { fill: 'none', stroke: $colors.darkeningMask }
        ]],
        // TODO NXT-279: for now halted is the same state as executed
        ['HALTED', [
            { fill: $colors.trafficLight.inactive, stroke: undefined },
            { fill: 'none', stroke: $colors.trafficLight.inactiveBorder },
            { fill: $colors.trafficLight.inactive, stroke: undefined },
            { fill: 'none', stroke: $colors.trafficLight.inactiveBorder },
            { fill: $colors.trafficLight.green, stroke: undefined },
            { fill: 'none', stroke: $colors.darkeningMask }
        ]],
        [null, [
            { fill: $colors.trafficLight.inactive, stroke: undefined },
            { fill: 'none', stroke: $colors.trafficLight.inactiveBorder },
            { fill: $colors.trafficLight.inactive, stroke: undefined },
            { fill: 'none', stroke: $colors.trafficLight.inactiveBorder },
            { fill: $colors.trafficLight.inactive, stroke: undefined },
            { fill: 'none', stroke: $colors.trafficLight.inactiveBorder }
        ]],
        ['any other state', []]
    ])('draws traffic lights for state %s', (state, style) => {
        if (state) {
            propsData.executionState = state;
        }
        muteConsole(mount);
        expect(getTrafficLights()).toStrictEqual(style);
    });


    it('shows all null state', () => {
        expect(wrapper.find('*').text()).toBe('');
        expect(wrapper.find('.warning').exists()).toBe(false);
        expect(wrapper.find('.error').exists()).toBe(false);
        expect(wrapper.find('.progress-circle').exists()).toBe(false);
    });

    it('shows "queued"', () => {
        propsData.executionState = 'QUEUED';
        mount();
        expect(wrapper.find('*').text()).toBe('queued');
    });

    it('shows dancing ball', () => {
        propsData.executionState = 'EXECUTING';
        propsData.progress = null;
        mount();

        expect(wrapper.find('.progress-circle').exists()).toBe(true);
        expect(wrapper.find('*').text()).toBe('');
    });

    it('shows progress percentage', () => {
        propsData.executionState = 'EXECUTING';
        propsData.progress = 50;
        mount();

        expect(wrapper.find('.progress-circle').exists()).toBe(false);
        expect(wrapper.find('*').text()).toMatch('50%');
    });

    it('shows error indicator', () => {
        propsData.error = 'error message';
        propsData.warning = 'warning message';
        mount();

        expect(wrapper.find('.error').exists()).toBe(true);
        expect(wrapper.find('.warning').exists()).toBe(false);
    });

    it('shows warning indicator', () => {
        propsData.warning = 'warning message';
        mount();

        expect(wrapper.find('.warning').exists()).toBe(true);
        expect(wrapper.find('.error').exists()).toBe(false);
    });

    describe('tooltips', () => {
        let currentTooltip;

        beforeEach(() => {
            let $store = mockVuexStore({
                workflow: {
                    mutations: {
                        setTooltip(state, tooltip) {
                            currentTooltip = tooltip;
                        }
                    }
                }
            });
            mocks.$store = $store;
        });

        it('shows no tooltips by default', async () => {
            mount();
            wrapper.find('g').trigger('mouseenter');
            await Vue.nextTick();
            expect(currentTooltip).toBeFalsy();
        });

        it('shows tooltips on error', async () => {
            propsData.error = 'this is an error';
            mount();
            wrapper.find('g').trigger('mouseenter');
            await Vue.nextTick();
            expect(currentTooltip).toStrictEqual({
                anchor: 'dummy',
                text: 'this is an error',
                type: 'error',
                x: 16,
                y: 59
            });

            wrapper.find('g').trigger('mouseleave');
            await Vue.nextTick();
            expect(currentTooltip).toBeFalsy();
        });
    });
});
